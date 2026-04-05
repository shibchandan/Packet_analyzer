#include "dpi_engine.h"
#include <iostream>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <chrono>
#include <cstring>
#include <fstream>

namespace DPI {

namespace {

std::string jsonEscape(const std::string& input) {
    std::ostringstream ss;
    for (char c : input) {
        switch (c) {
            case '\\': ss << "\\\\"; break;
            case '"': ss << "\\\""; break;
            case '\n': ss << "\\n"; break;
            case '\r': ss << "\\r"; break;
            case '\t': ss << "\\t"; break;
            default: ss << c; break;
        }
    }
    return ss.str();
}

std::string ipToString(uint32_t ip) {
    std::ostringstream ss;
    ss << ((ip >> 0) & 0xFF) << "."
       << ((ip >> 8) & 0xFF) << "."
       << ((ip >> 16) & 0xFF) << "."
       << ((ip >> 24) & 0xFF);
    return ss.str();
}

std::string protocolToString(uint8_t protocol) {
    switch (protocol) {
        case 1: return "ICMP";
        case 6: return "TCP";
        case 17: return "UDP";
        default: return "OTHER";
    }
}

template <typename K>
std::vector<std::pair<K, uint64_t>> topEntries(const std::unordered_map<K, uint64_t>& counts, size_t limit = 10) {
    std::vector<std::pair<K, uint64_t>> entries(counts.begin(), counts.end());
    std::sort(entries.begin(), entries.end(),
              [](const auto& a, const auto& b) { return a.second > b.second; });
    if (entries.size() > limit) {
        entries.resize(limit);
    }
    return entries;
}

std::string dnsKey(const std::string& domain, uint32_t src_ip, uint32_t dst_ip) {
    std::ostringstream ss;
    ss << domain << "|" << src_ip << "|" << dst_ip;
    return ss.str();
}

}  // namespace

// ============================================================================
// DPIEngine Implementation
// ============================================================================

DPIEngine::DPIEngine(const Config& config)
    : config_(config), output_queue_(10000) {
    
    std::cout << "\n";
    std::cout << "╔══════════════════════════════════════════════════════════════╗\n";
    std::cout << "║                    DPI ENGINE v1.0                            ║\n";
    std::cout << "║               Deep Packet Inspection System                   ║\n";
    std::cout << "╠══════════════════════════════════════════════════════════════╣\n";
    std::cout << "║ Configuration:                                                ║\n";
    std::cout << "║   Load Balancers:    " << std::setw(3) << config.num_load_balancers << "                                       ║\n";
    std::cout << "║   FPs per LB:        " << std::setw(3) << config.fps_per_lb << "                                       ║\n";
    std::cout << "║   Total FP threads:  " << std::setw(3) << (config.num_load_balancers * config.fps_per_lb) << "                                       ║\n";
    std::cout << "╚══════════════════════════════════════════════════════════════╝\n";
}

DPIEngine::~DPIEngine() {
    stop();
}

bool DPIEngine::initialize() {
    // Create rule manager
    rule_manager_ = std::make_unique<RuleManager>();
    
    // Load rules if specified
    if (!config_.rules_file.empty()) {
        rule_manager_->loadRules(config_.rules_file);
    }
    
    // Create output callback
    auto output_cb = [this](const PacketJob& job, PacketAction action) {
        handleOutput(job, action);
    };
    
    // Create FP manager (creates FP threads and their queues)
    int total_fps = config_.num_load_balancers * config_.fps_per_lb;
    fp_manager_ = std::make_unique<FPManager>(total_fps, rule_manager_.get(), output_cb);
    
    // Create LB manager (creates LB threads, connects to FP queues)
    lb_manager_ = std::make_unique<LBManager>(
        config_.num_load_balancers,
        config_.fps_per_lb,
        fp_manager_->getQueuePtrs()
    );
    
    // Create global connection table
    global_conn_table_ = std::make_unique<GlobalConnectionTable>(total_fps);
    for (int i = 0; i < total_fps; i++) {
        global_conn_table_->registerTracker(i, &fp_manager_->getFP(i).getConnectionTracker());
    }
    
    std::cout << "[DPIEngine] Initialized successfully\n";
    return true;
}

void DPIEngine::start() {
    if (running_) return;
    
    running_ = true;
    processing_complete_ = false;
    
    // Start output thread
    output_thread_ = std::thread(&DPIEngine::outputThreadFunc, this);
    
    // Start FP threads
    fp_manager_->startAll();
    
    // Start LB threads
    lb_manager_->startAll();
    
    std::cout << "[DPIEngine] All threads started\n";
}

void DPIEngine::stop() {
    if (!running_) return;
    
    running_ = false;
    
    // Stop LB threads first (they feed FPs)
    if (lb_manager_) {
        lb_manager_->stopAll();
    }
    
    // Stop FP threads
    if (fp_manager_) {
        fp_manager_->stopAll();
    }
    
    // Stop output thread
    output_queue_.shutdown();
    if (output_thread_.joinable()) {
        output_thread_.join();
    }
    
    std::cout << "[DPIEngine] All threads stopped\n";
}

void DPIEngine::waitForCompletion() {
    // Wait for reader to finish
    if (reader_thread_.joinable()) {
        reader_thread_.join();
    }
    
    // Wait a bit for queues to drain
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    // Signal completion
    processing_complete_ = true;
}

bool DPIEngine::processFile(const std::string& input_file,
                            const std::string& output_file) {
    
    std::cout << "\n[DPIEngine] Processing: " << input_file << "\n";
    std::cout << "[DPIEngine] Output to:  " << output_file << "\n\n";

    {
        std::lock_guard<std::mutex> lock(analytics_mutex_);
        analytics_ = TrafficAnalytics{};
    }
    
    // Initialize if not already done
    if (!rule_manager_) {
        if (!initialize()) {
            return false;
        }
    }
    
    // Open output file
    output_file_.open(output_file, std::ios::binary);
    if (!output_file_.is_open()) {
        std::cerr << "[DPIEngine] Error: Cannot open output file\n";
        return false;
    }
    
    // Start processing threads
    start();
    
    // Start reader thread
    reader_thread_ = std::thread(&DPIEngine::readerThreadFunc, this, input_file);
    
    // Wait for completion
    waitForCompletion();
    
    // Give some time for final packets to process
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    
    // Stop all threads
    stop();
    
    // Close output file
    if (output_file_.is_open()) {
        output_file_.close();
    }
    
    // Print final report
    std::cout << generateReport();
    std::cout << fp_manager_->generateClassificationReport();
    
    return true;
}

void DPIEngine::readerThreadFunc(const std::string& input_file) {
    PacketAnalyzer::PcapReader reader;
    
    if (!reader.open(input_file)) {
        std::cerr << "[Reader] Error: Cannot open input file\n";
        return;
    }
    
    // Write PCAP header to output
    writeOutputHeader(reader.getGlobalHeader());
    
    PacketAnalyzer::RawPacket raw;
    PacketAnalyzer::ParsedPacket parsed;
    uint32_t packet_id = 0;
    
    std::cout << "[Reader] Starting packet processing...\n";
    
    while (reader.readNextPacket(raw)) {
        // Parse the packet
        if (!PacketAnalyzer::PacketParser::parse(raw, parsed)) {
            continue;  // Skip unparseable packets
        }
        
        // Only process IP packets with TCP/UDP
        if (!parsed.has_ip || (!parsed.has_tcp && !parsed.has_udp)) {
            continue;
        }
        
        // Create packet job
        PacketJob job = createPacketJob(raw, parsed, packet_id++);
        
        // Update global stats
        stats_.total_packets++;
        stats_.total_bytes += raw.data.size();
        recordPacketAnalytics(job);
        
        if (parsed.has_tcp) {
            stats_.tcp_packets++;
        } else if (parsed.has_udp) {
            stats_.udp_packets++;
        }
        
        // Send to appropriate LB based on hash
        LoadBalancer& lb = lb_manager_->getLBForPacket(job.tuple);
        lb.getInputQueue().push(std::move(job));
    }
    
    std::cout << "[Reader] Finished reading " << packet_id << " packets\n";
    reader.close();
}

void DPIEngine::recordPacketAnalytics(const PacketJob& job) {
    std::lock_guard<std::mutex> lock(analytics_mutex_);
    analytics_.src_ip_counts[job.tuple.src_ip]++;
    analytics_.dst_ip_counts[job.tuple.dst_ip]++;
    analytics_.src_port_counts[job.tuple.src_port]++;
    analytics_.dst_port_counts[job.tuple.dst_port]++;
    analytics_.protocol_counts[job.tuple.protocol]++;
}

PacketJob DPIEngine::createPacketJob(const PacketAnalyzer::RawPacket& raw,
                                      const PacketAnalyzer::ParsedPacket& parsed,
                                      uint32_t packet_id) {
    PacketJob job;
    job.packet_id = packet_id;
    job.ts_sec = raw.header.ts_sec;
    job.ts_usec = raw.header.ts_usec;
    
    // Set five-tuple - parse IP addresses from string back to uint32
    auto parseIP = [](const std::string& ip) -> uint32_t {
        uint32_t result = 0;
        int octet = 0;
        int shift = 0;
        for (char c : ip) {
            if (c == '.') {
                result |= (octet << shift);
                shift += 8;
                octet = 0;
            } else if (c >= '0' && c <= '9') {
                octet = octet * 10 + (c - '0');
            }
        }
        result |= (octet << shift);
        return result;
    };
    
    job.tuple.src_ip = parseIP(parsed.src_ip);
    job.tuple.dst_ip = parseIP(parsed.dest_ip);
    job.tuple.src_port = parsed.src_port;
    job.tuple.dst_port = parsed.dest_port;
    job.tuple.protocol = parsed.protocol;
    
    // TCP flags
    job.tcp_flags = parsed.tcp_flags;
    
    // Copy packet data
    job.data = raw.data;
    
    // Calculate offsets
    job.eth_offset = 0;
    job.ip_offset = 14;  // Ethernet header is 14 bytes
    
    // IP header length
    if (job.data.size() > 14) {
        uint8_t ip_ihl = job.data[14] & 0x0F;
        size_t ip_header_len = ip_ihl * 4;
        job.transport_offset = 14 + ip_header_len;
        
        // Transport header length
        if (parsed.has_tcp && job.data.size() > job.transport_offset) {
            uint8_t tcp_data_offset = (job.data[job.transport_offset + 12] >> 4) & 0x0F;
            size_t tcp_header_len = tcp_data_offset * 4;
            job.payload_offset = job.transport_offset + tcp_header_len;
        } else if (parsed.has_udp) {
            job.payload_offset = job.transport_offset + 8;  // UDP header is 8 bytes
        }
        
        if (job.payload_offset < job.data.size()) {
            job.payload_length = job.data.size() - job.payload_offset;
            job.payload_data = job.data.data() + job.payload_offset;
        }
    }
    
    return job;
}

void DPIEngine::outputThreadFunc() {
    while (running_ || !output_queue_.empty()) {
        auto job_opt = output_queue_.popWithTimeout(std::chrono::milliseconds(100));
        
        if (job_opt) {
            writeOutputPacket(*job_opt);
        }
    }
}

void DPIEngine::handleOutput(const PacketJob& job, PacketAction action) {
    recordDnsAnalytics(job, action);

    if (action == PacketAction::DROP) {
        stats_.dropped_packets++;
        return;
    }
    
    stats_.forwarded_packets++;
    output_queue_.push(job);
}

void DPIEngine::recordDnsAnalytics(const PacketJob& job, PacketAction action) {
    if ((job.tuple.dst_port != 53 && job.tuple.src_port != 53) ||
        job.payload_offset >= job.data.size() ||
        job.payload_length == 0) {
        return;
    }

    const uint8_t* payload = job.data.data() + job.payload_offset;
    auto domain = DNSExtractor::extractQuery(payload, job.payload_length);
    if (!domain) {
        return;
    }

    const uint32_t source_ip = job.tuple.src_ip;
    const uint32_t dns_server_ip = (job.tuple.dst_port == 53) ? job.tuple.dst_ip : job.tuple.src_ip;
    const std::string key = dnsKey(*domain, source_ip, dns_server_ip);

    std::lock_guard<std::mutex> lock(analytics_mutex_);
    auto& entry = analytics_.dns_queries[key];
    if (entry.count == 0) {
        entry.domain = *domain;
        entry.source_ip = source_ip;
        entry.dns_server_ip = dns_server_ip;
    }
    entry.count++;
    if (action == PacketAction::DROP) {
        entry.blocked_count++;
    }
}

bool DPIEngine::writeOutputHeader(const PacketAnalyzer::PcapGlobalHeader& header) {
    std::lock_guard<std::mutex> lock(output_mutex_);
    
    if (!output_file_.is_open()) return false;
    
    output_file_.write(reinterpret_cast<const char*>(&header), sizeof(header));
    return output_file_.good();
}

void DPIEngine::writeOutputPacket(const PacketJob& job) {
    std::lock_guard<std::mutex> lock(output_mutex_);
    
    if (!output_file_.is_open()) return;
    
    // Write packet header
    PacketAnalyzer::PcapPacketHeader pkt_header;
    pkt_header.ts_sec = job.ts_sec;
    pkt_header.ts_usec = job.ts_usec;
    pkt_header.incl_len = job.data.size();
    pkt_header.orig_len = job.data.size();
    
    output_file_.write(reinterpret_cast<const char*>(&pkt_header), sizeof(pkt_header));
    output_file_.write(reinterpret_cast<const char*>(job.data.data()), job.data.size());
}

// ============================================================================
// Rule Management API
// ============================================================================

void DPIEngine::blockIP(const std::string& ip) {
    if (rule_manager_) {
        rule_manager_->blockIP(ip);
    }
}

void DPIEngine::unblockIP(const std::string& ip) {
    if (rule_manager_) {
        rule_manager_->unblockIP(ip);
    }
}

void DPIEngine::blockApp(AppType app) {
    if (rule_manager_) {
        rule_manager_->blockApp(app);
    }
}

void DPIEngine::blockApp(const std::string& app_name) {
    for (int i = 0; i < static_cast<int>(AppType::APP_COUNT); i++) {
        if (appTypeToString(static_cast<AppType>(i)) == app_name) {
            blockApp(static_cast<AppType>(i));
            return;
        }
    }
    std::cerr << "[DPIEngine] Unknown app: " << app_name << "\n";
}

void DPIEngine::unblockApp(AppType app) {
    if (rule_manager_) {
        rule_manager_->unblockApp(app);
    }
}

void DPIEngine::unblockApp(const std::string& app_name) {
    for (int i = 0; i < static_cast<int>(AppType::APP_COUNT); i++) {
        if (appTypeToString(static_cast<AppType>(i)) == app_name) {
            unblockApp(static_cast<AppType>(i));
            return;
        }
    }
}

void DPIEngine::blockDomain(const std::string& domain) {
    if (rule_manager_) {
        rule_manager_->blockDomain(domain);
    }
}

void DPIEngine::unblockDomain(const std::string& domain) {
    if (rule_manager_) {
        rule_manager_->unblockDomain(domain);
    }
}

void DPIEngine::blockProtocol(const std::string& protocol_name) {
    if (rule_manager_) {
        rule_manager_->blockProtocol(protocol_name);
    }
}

void DPIEngine::unblockProtocol(const std::string& protocol_name) {
    if (rule_manager_) {
        rule_manager_->unblockProtocol(protocol_name);
    }
}

bool DPIEngine::loadRules(const std::string& filename) {
    if (rule_manager_) {
        return rule_manager_->loadRules(filename);
    }
    return false;
}

bool DPIEngine::saveRules(const std::string& filename) {
    if (rule_manager_) {
        return rule_manager_->saveRules(filename);
    }
    return false;
}

// ============================================================================
// Reporting
// ============================================================================

std::string DPIEngine::generateReport() const {
    std::ostringstream ss;
    
    ss << "\n╔══════════════════════════════════════════════════════════════╗\n";
    ss << "║                    DPI ENGINE STATISTICS                      ║\n";
    ss << "╠══════════════════════════════════════════════════════════════╣\n";
    
    ss << "║ PACKET STATISTICS                                             ║\n";
    ss << "║   Total Packets:      " << std::setw(12) << stats_.total_packets.load() << "                        ║\n";
    ss << "║   Total Bytes:        " << std::setw(12) << stats_.total_bytes.load() << "                        ║\n";
    ss << "║   TCP Packets:        " << std::setw(12) << stats_.tcp_packets.load() << "                        ║\n";
    ss << "║   UDP Packets:        " << std::setw(12) << stats_.udp_packets.load() << "                        ║\n";
    
    ss << "╠══════════════════════════════════════════════════════════════╣\n";
    ss << "║ FILTERING STATISTICS                                          ║\n";
    ss << "║   Forwarded:          " << std::setw(12) << stats_.forwarded_packets.load() << "                        ║\n";
    ss << "║   Dropped/Blocked:    " << std::setw(12) << stats_.dropped_packets.load() << "                        ║\n";
    
    if (stats_.total_packets > 0) {
        double drop_rate = 100.0 * stats_.dropped_packets.load() / stats_.total_packets.load();
        ss << "║   Drop Rate:          " << std::setw(11) << std::fixed << std::setprecision(2) << drop_rate << "%                        ║\n";
    }
    
    if (lb_manager_) {
        auto lb_stats = lb_manager_->getAggregatedStats();
        ss << "╠══════════════════════════════════════════════════════════════╣\n";
        ss << "║ LOAD BALANCER STATISTICS                                      ║\n";
        ss << "║   LB Received:        " << std::setw(12) << lb_stats.total_received << "                        ║\n";
        ss << "║   LB Dispatched:      " << std::setw(12) << lb_stats.total_dispatched << "                        ║\n";
    }
    
    if (fp_manager_) {
        auto fp_stats = fp_manager_->getAggregatedStats();
        ss << "╠══════════════════════════════════════════════════════════════╣\n";
        ss << "║ FAST PATH STATISTICS                                          ║\n";
        ss << "║   FP Processed:       " << std::setw(12) << fp_stats.total_processed << "                        ║\n";
        ss << "║   FP Forwarded:       " << std::setw(12) << fp_stats.total_forwarded << "                        ║\n";
        ss << "║   FP Dropped:         " << std::setw(12) << fp_stats.total_dropped << "                        ║\n";
        ss << "║   Active Connections: " << std::setw(12) << fp_stats.total_connections << "                        ║\n";
    }
    
    if (rule_manager_) {
        auto rule_stats = rule_manager_->getStats();
        ss << "╠══════════════════════════════════════════════════════════════╣\n";
        ss << "║ BLOCKING RULES                                                ║\n";
        ss << "║   Blocked IPs:        " << std::setw(12) << rule_stats.blocked_ips << "                        ║\n";
        ss << "║   Blocked Apps:       " << std::setw(12) << rule_stats.blocked_apps << "                        ║\n";
        ss << "║   Blocked Domains:    " << std::setw(12) << rule_stats.blocked_domains << "                        ║\n";
        ss << "║   Blocked Ports:      " << std::setw(12) << rule_stats.blocked_ports << "                        ║\n";
    }
    
    ss << "╚══════════════════════════════════════════════════════════════╝\n";
    
    return ss.str();
}

std::string DPIEngine::generateClassificationReport() const {
    if (fp_manager_) {
        return fp_manager_->generateClassificationReport();
    }
    return "";
}

bool DPIEngine::writeJsonReport(const std::string& filename) const {
    std::ofstream out(filename, std::ios::binary);
    if (!out.is_open()) {
        return false;
    }

    out << "{\n";
    out << "  \"summary\": {\n";
    out << "    \"totalPackets\": " << stats_.total_packets.load() << ",\n";
    out << "    \"totalBytes\": " << stats_.total_bytes.load() << ",\n";
    out << "    \"forwardedPackets\": " << stats_.forwarded_packets.load() << ",\n";
    out << "    \"droppedPackets\": " << stats_.dropped_packets.load() << ",\n";
    out << "    \"tcpPackets\": " << stats_.tcp_packets.load() << ",\n";
    out << "    \"udpPackets\": " << stats_.udp_packets.load() << "\n";
    out << "  }";

    std::vector<std::pair<uint32_t, uint64_t>> top_src_ips;
    std::vector<std::pair<uint32_t, uint64_t>> top_dst_ips;
    std::vector<std::pair<uint16_t, uint64_t>> top_src_ports;
    std::vector<std::pair<uint16_t, uint64_t>> top_dst_ports;
    std::vector<std::pair<uint8_t, uint64_t>> top_protocols;
    std::vector<DNSQueryAnalytics> top_dns_queries;
    {
        std::lock_guard<std::mutex> lock(analytics_mutex_);
        top_src_ips = topEntries(analytics_.src_ip_counts);
        top_dst_ips = topEntries(analytics_.dst_ip_counts);
        top_src_ports = topEntries(analytics_.src_port_counts);
        top_dst_ports = topEntries(analytics_.dst_port_counts);
        top_protocols = topEntries(analytics_.protocol_counts);
        for (const auto& pair : analytics_.dns_queries) {
            top_dns_queries.push_back(pair.second);
        }
    }
    std::sort(top_dns_queries.begin(), top_dns_queries.end(),
              [](const auto& a, const auto& b) { return a.count > b.count; });
    if (top_dns_queries.size() > 20) {
        top_dns_queries.resize(20);
    }

    if (fp_manager_) {
        auto summary = fp_manager_->getClassificationSummary();
        out << ",\n  \"classification\": {\n";
        out << "    \"totalConnections\": " << summary.total_connections << ",\n";
        out << "    \"classifiedConnections\": " << summary.total_classified << ",\n";
        out << "    \"unknownConnections\": " << summary.total_unknown << "\n";
        out << "  },\n";

        out << "  \"apps\": [\n";
        for (size_t i = 0; i < summary.app_counts.size(); ++i) {
            const auto& entry = summary.app_counts[i];
            double pct = summary.total_connections > 0
                ? (100.0 * static_cast<double>(entry.second) / static_cast<double>(summary.total_connections))
                : 0.0;
            out << "    {\"name\": \"" << jsonEscape(appTypeToString(entry.first))
                << "\", \"count\": " << entry.second
                << ", \"percent\": " << std::fixed << std::setprecision(2) << pct << "}";
            if (i + 1 < summary.app_counts.size()) {
                out << ",";
            }
            out << "\n";
        }
        out << "  ],\n";

        out << "  \"domains\": [\n";
        for (size_t i = 0; i < summary.domain_counts.size(); ++i) {
            const auto& entry = summary.domain_counts[i];
            out << "    {\"domain\": \"" << jsonEscape(entry.first)
                << "\", \"count\": " << entry.second << "}";
            if (i + 1 < summary.domain_counts.size()) {
                out << ",";
            }
            out << "\n";
        }
        out << "  ],\n";

        out << "  \"blockedReasons\": [\n";
        for (size_t i = 0; i < summary.blocked_reason_counts.size(); ++i) {
            const auto& entry = summary.blocked_reason_counts[i];
            out << "    {\"reason\": \"" << jsonEscape(entry.first)
                << "\", \"count\": " << entry.second << "}";
            if (i + 1 < summary.blocked_reason_counts.size()) {
                out << ",";
            }
            out << "\n";
        }
        out << "  ],\n";
    } else {
        out << ",\n  \"classification\": {\n";
        out << "    \"totalConnections\": 0,\n";
        out << "    \"classifiedConnections\": 0,\n";
        out << "    \"unknownConnections\": 0\n";
        out << "  },\n";
        out << "  \"apps\": [],\n";
        out << "  \"domains\": [],\n";
        out << "  \"blockedReasons\": [],\n";
    }

    out << "  \"traffic\": {\n";

    out << "    \"topSourceIps\": [\n";
    for (size_t i = 0; i < top_src_ips.size(); ++i) {
        out << "      {\"ip\": \"" << ipToString(top_src_ips[i].first) << "\", \"count\": " << top_src_ips[i].second << "}";
        if (i + 1 < top_src_ips.size()) out << ",";
        out << "\n";
    }
    out << "    ],\n";

    out << "    \"topDestinationIps\": [\n";
    for (size_t i = 0; i < top_dst_ips.size(); ++i) {
        out << "      {\"ip\": \"" << ipToString(top_dst_ips[i].first) << "\", \"count\": " << top_dst_ips[i].second << "}";
        if (i + 1 < top_dst_ips.size()) out << ",";
        out << "\n";
    }
    out << "    ],\n";

    out << "    \"topSourcePorts\": [\n";
    for (size_t i = 0; i < top_src_ports.size(); ++i) {
        out << "      {\"port\": " << top_src_ports[i].first << ", \"count\": " << top_src_ports[i].second << "}";
        if (i + 1 < top_src_ports.size()) out << ",";
        out << "\n";
    }
    out << "    ],\n";

    out << "    \"topDestinationPorts\": [\n";
    for (size_t i = 0; i < top_dst_ports.size(); ++i) {
        out << "      {\"port\": " << top_dst_ports[i].first << ", \"count\": " << top_dst_ports[i].second << "}";
        if (i + 1 < top_dst_ports.size()) out << ",";
        out << "\n";
    }
    out << "    ],\n";

    out << "    \"topProtocols\": [\n";
    for (size_t i = 0; i < top_protocols.size(); ++i) {
        out << "      {\"protocol\": \"" << protocolToString(top_protocols[i].first)
            << "\", \"number\": " << static_cast<int>(top_protocols[i].first)
            << ", \"count\": " << top_protocols[i].second << "}";
        if (i + 1 < top_protocols.size()) out << ",";
        out << "\n";
    }
    out << "    ],\n";

    out << "    \"dnsQueries\": [\n";
    for (size_t i = 0; i < top_dns_queries.size(); ++i) {
        const auto& entry = top_dns_queries[i];
        out << "      {\"domain\": \"" << jsonEscape(entry.domain)
            << "\", \"sourceIp\": \"" << ipToString(entry.source_ip)
            << "\", \"dnsServer\": \"" << ipToString(entry.dns_server_ip)
            << "\", \"count\": " << entry.count
            << ", \"blockedCount\": " << entry.blocked_count << "}";
        if (i + 1 < top_dns_queries.size()) out << ",";
        out << "\n";
    }
    out << "    ]\n";

    out << "  }\n";

    out << "}\n";
    return out.good();
}

const DPIStats& DPIEngine::getStats() const {
    return stats_;
}

void DPIEngine::printStatus() const {
    std::cout << "\n--- Live Status ---\n";
    std::cout << "Packets: " << stats_.total_packets.load()
              << " | Forwarded: " << stats_.forwarded_packets.load()
              << " | Dropped: " << stats_.dropped_packets.load() << "\n";
    
    if (fp_manager_) {
        auto fp_stats = fp_manager_->getAggregatedStats();
        std::cout << "Connections: " << fp_stats.total_connections << "\n";
    }
}

} // namespace DPI
