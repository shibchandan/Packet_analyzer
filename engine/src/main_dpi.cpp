#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <csignal>
#include "dpi_engine.h"

using namespace DPI;

DPIEngine* global_engine_ptr = nullptr;

void signalHandler(int signum) {
    std::cout << "\nInterrupt signal (" << signum << ") received. Shutting down gracefully...\n";
    if (global_engine_ptr) {
        global_engine_ptr->stop();
    }
}

void printUsage(const char* program) {
    std::cout << R"(
╔══════════════════════════════════════════════════════════════╗
║                    DPI ENGINE v1.0                            ║
║               Deep Packet Inspection System                   ║
╚══════════════════════════════════════════════════════════════╝

Usage: )" << program << R"( <input.pcap> <output.pcap> [options]

Arguments:
  input.pcap     Input PCAP file (captured user traffic)
  output.pcap    Output PCAP file (filtered traffic to internet)

Options:
  --block-ip <ip>        Block packets from source IP
  --block-app <app>      Block application (e.g., YouTube, Facebook)
  --block-domain <dom>   Block domain (supports wildcards: *.facebook.com)
  --block-protocol <p>   Block protocol (e.g., DNS, ICMP, HTTP, MODBUS, S7)
  --rules <file>         Load blocking rules from file
  --report-json <file>   Write structured JSON report to file
  --lbs <n>              Number of load balancer threads (default: 2)
  --fps <n>              FP threads per LB (default: 2)
  --verbose              Enable verbose output
  --live                 Run in live interception mode (WinDivert)

Examples:
  )" << program << R"( capture.pcap filtered.pcap
  )" << program << R"( capture.pcap filtered.pcap --block-app YouTube
  )" << program << R"( capture.pcap filtered.pcap --block-ip 192.168.1.50 --block-domain *.tiktok.com
  )" << program << R"( capture.pcap filtered.pcap --rules blocking_rules.txt

Supported Apps for Blocking:
  Google, YouTube, Facebook, Instagram, Twitter/X, Netflix, Amazon,
  Microsoft, Apple, WhatsApp, Telegram, TikTok, Spotify, Zoom, Discord, GitHub

Architecture:
  ┌─────────────┐
  │ PCAP Reader │  Reads packets from input file
  └──────┬──────┘
         │ hash(5-tuple) % num_lbs
         ▼
  ┌──────┴──────┐
  │ Load Balancer │  2 LB threads distribute to FPs
  │   LB0 │ LB1   │
  └──┬────┴────┬──┘
     │         │  hash(5-tuple) % fps_per_lb
     ▼         ▼
  ┌──┴──┐   ┌──┴──┐
  │FP0-1│   │FP2-3│  4 FP threads: DPI, classification, blocking
  └──┬──┘   └──┬──┘
     │         │
     ▼         ▼
  ┌──┴─────────┴──┐
  │ Output Writer │  Writes forwarded packets to output
  └───────────────┘

)";
}

std::vector<std::string> split(const std::string& s) {
    std::vector<std::string> tokens;
    std::istringstream iss(s);
    std::string token;
    while (iss >> token) {
        tokens.push_back(token);
    }
    return tokens;
}

int main(int argc, char* argv[]) {
    std::string input_file;
    std::string output_file;
    
    // Parse options
    DPIEngine::Config config;
    config.num_load_balancers = 2;
    config.fps_per_lb = 2;
    
    std::vector<std::string> block_ips;
    std::vector<std::string> block_apps;
    std::vector<std::string> block_domains;
    std::vector<std::string> block_protocols;
    std::string rules_file;
    std::string report_json_file;
    
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        
        if (arg == "--block-ip" && i + 1 < argc) {
            block_ips.push_back(argv[++i]);
        } else if (arg == "--block-app" && i + 1 < argc) {
            block_apps.push_back(argv[++i]);
        } else if (arg == "--block-domain" && i + 1 < argc) {
            block_domains.push_back(argv[++i]);
        } else if (arg == "--block-protocol" && i + 1 < argc) {
            block_protocols.push_back(argv[++i]);
        } else if (arg == "--rules" && i + 1 < argc) {
            rules_file = argv[++i];
        } else if (arg == "--report-json" && i + 1 < argc) {
            report_json_file = argv[++i];
        } else if (arg == "--lbs" && i + 1 < argc) {
            config.num_load_balancers = std::stoi(argv[++i]);
        } else if (arg == "--fps" && i + 1 < argc) {
            config.fps_per_lb = std::stoi(argv[++i]);
        } else if (arg == "--verbose") {
            config.verbose = true;
        } else if (arg == "--live") {
            config.live_mode = true;
        } else if (arg == "--help" || arg == "-h") {
            printUsage(argv[0]);
            return 0;
        } else if (arg[0] != '-') {
            if (input_file.empty()) input_file = arg;
            else if (output_file.empty()) output_file = arg;
        }
    }
    
    if (!config.live_mode && (input_file.empty() || output_file.empty())) {
        printUsage(argv[0]);
        return 1;
    }
    
    // Setup signal handler for graceful shutdown
    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);
    
    // Create DPI engine
    DPIEngine engine(config);
    
    // Initialize
    if (!engine.initialize()) {
        std::cerr << "Failed to initialize DPI engine\n";
        return 1;
    }
    
    // Load rules from file if specified
    if (!rules_file.empty()) {
        engine.loadRules(rules_file);
    }
    
    // Apply command-line blocking rules
    for (const auto& ip : block_ips) {
        engine.blockIP(ip);
    }
    
    for (const auto& app : block_apps) {
        engine.blockApp(app);
    }
    
    for (const auto& domain : block_domains) {
        engine.blockDomain(domain);
    }

    for (const auto& protocol : block_protocols) {
        engine.blockProtocol(protocol);
    }
    
    global_engine_ptr = &engine;
    
    if (config.live_mode) {
        if (!engine.runLive()) {
            std::cerr << "Failed to start live mode\n";
            return 1;
        }
        
        // Wait until stopped by signal
        while (engine.isRunning()) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
            // Optional: periodically write json report if specified
            if (!report_json_file.empty()) {
                engine.writeJsonReport(report_json_file);
            }
        }
    } else {
        // Process the file
        if (!engine.processFile(input_file, output_file)) {
            std::cerr << "Failed to process file\n";
            return 1;
        }
    }

    if (!report_json_file.empty() && !engine.writeJsonReport(report_json_file)) {
        std::cerr << "Failed to write JSON report to: " << report_json_file << "\n";
        return 1;
    }
    
    std::cout << "\nProcessing complete!\n";
    if (!config.live_mode) {
        std::cout << "Output written to: " << output_file << "\n";
    }
    
    global_engine_ptr = nullptr;
    return 0;
}
