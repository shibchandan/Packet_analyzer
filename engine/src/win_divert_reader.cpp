#include "win_divert_reader.h"
#include "windivert.h"
#include <iostream>
#include <chrono>
#include <cstring>

namespace PacketAnalyzer {

// Prepend dummy ethernet header to IP packet (Dst MAC: 00..00, Src MAC: 00..00, EtherType: 0x0800 for IPv4, 0x86DD for IPv6)
const uint8_t ETH_HEADER_IPV4[14] = {0,0,0,0,0,0, 0,0,0,0,0,0, 0x08, 0x00};
const uint8_t ETH_HEADER_IPV6[14] = {0,0,0,0,0,0, 0,0,0,0,0,0, 0x86, 0xDD};

WinDivertReader::WinDivertReader() : handle_(INVALID_HANDLE_VALUE) {
    buffer_.resize(65535);
}

WinDivertReader::~WinDivertReader() {
    close();
}

bool WinDivertReader::open(const std::string& filter) {
    close();
    
    // Open WinDivert handle for network layer
    handle_ = WinDivertOpen(filter.c_str(), WINDIVERT_LAYER_NETWORK, 0, 0);
    if (handle_ == INVALID_HANDLE_VALUE) {
        std::cerr << "Error: Could not open WinDivert handle. Ensure you are running as Administrator. Error Code: " << GetLastError() << std::endl;
        return false;
    }
    
    std::cout << "WinDivert handle opened with filter: " << filter << std::endl;
    return true;
}

void WinDivertReader::close() {
    if (handle_ != INVALID_HANDLE_VALUE) {
        WinDivertClose(handle_);
        handle_ = INVALID_HANDLE_VALUE;
    }
}

bool WinDivertReader::readNextPacket(RawPacket& packet) {
    if (handle_ == INVALID_HANDLE_VALUE) return false;
    
    WINDIVERT_ADDRESS addr;
    UINT readLen = 0;
    
    if (!WinDivertRecv(handle_, buffer_.data(), buffer_.size(), &readLen, &addr)) {
        std::cerr << "WinDivertRecv failed: " << GetLastError() << std::endl;
        return false;
    }
    
    // Prepend Ethernet Header to simulate PCAP packet
    bool is_ipv6 = (buffer_[0] >> 4) == 6;
    packet.data.clear();
    packet.data.reserve(14 + readLen);
    
    if (is_ipv6) {
        packet.data.insert(packet.data.end(), ETH_HEADER_IPV6, ETH_HEADER_IPV6 + 14);
    } else {
        packet.data.insert(packet.data.end(), ETH_HEADER_IPV4, ETH_HEADER_IPV4 + 14);
    }
    
    packet.data.insert(packet.data.end(), buffer_.begin(), buffer_.begin() + readLen);
    
    // Store WINDIVERT_ADDRESS for re-injection
    packet.windivert_addr_bytes.resize(sizeof(WINDIVERT_ADDRESS));
    std::memcpy(packet.windivert_addr_bytes.data(), &addr, sizeof(WINDIVERT_ADDRESS));
    
    // Fabricate PCAP Header
    auto now = std::chrono::system_clock::now();
    auto epoch = now.time_since_epoch();
    auto sec = std::chrono::duration_cast<std::chrono::seconds>(epoch);
    auto usec = std::chrono::duration_cast<std::chrono::microseconds>(epoch - sec);
    
    packet.header.ts_sec = static_cast<uint32_t>(sec.count());
    packet.header.ts_usec = static_cast<uint32_t>(usec.count());
    packet.header.incl_len = static_cast<uint32_t>(packet.data.size());
    packet.header.orig_len = static_cast<uint32_t>(packet.data.size());
    
    return true;
}

bool WinDivertReader::sendPacket(const RawPacket& packet) {
    if (handle_ == INVALID_HANDLE_VALUE) return false;
    
    if (packet.windivert_addr_bytes.size() != sizeof(WINDIVERT_ADDRESS)) {
        return false;
    }
    
    WINDIVERT_ADDRESS addr;
    std::memcpy(&addr, packet.windivert_addr_bytes.data(), sizeof(WINDIVERT_ADDRESS));
    
    // Remove the fake ethernet header
    if (packet.data.size() <= 14) return false;
    
    UINT writeLen = 0;
    const uint8_t* ip_packet = packet.data.data() + 14;
    UINT ip_packet_len = static_cast<UINT>(packet.data.size() - 14);
    
    if (!WinDivertSend(handle_, (PVOID)ip_packet, ip_packet_len, &writeLen, &addr)) {
        std::cerr << "WinDivertSend failed: " << GetLastError() << std::endl;
        return false;
    }
    
    return true;
}

} // namespace PacketAnalyzer
