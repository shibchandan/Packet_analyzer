#ifndef WIN_DIVERT_READER_H
#define WIN_DIVERT_READER_H

#include <string>
#include <vector>
#include "pcap_reader.h"
#include <windows.h> // For HANDLE

namespace PacketAnalyzer {

class WinDivertReader {
public:
    WinDivertReader();
    ~WinDivertReader();

    // Open WinDivert handle.
    bool open(const std::string& filter = "true");
    
    void close();
    
    // Read next packet from network
    bool readNextPacket(RawPacket& packet);
    
    // Send packet back into network
    bool sendPacket(const RawPacket& packet);
    
    bool isOpen() const { return handle_ != INVALID_HANDLE_VALUE; }

private:
    HANDLE handle_;
    std::vector<uint8_t> buffer_;
};

} // namespace PacketAnalyzer

#endif // WIN_DIVERT_READER_H
