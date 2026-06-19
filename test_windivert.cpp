#include <iostream>
#include <windows.h>
#include "windivert.h"

int main() {
    std::cout << "Attempting to open WinDivert handle..." << std::endl;
    HANDLE handle = WinDivertOpen("ip", WINDIVERT_LAYER_NETWORK, 0, 0);
    if (handle == INVALID_HANDLE_VALUE) {
        DWORD err = GetLastError();
        std::cerr << "WinDivertOpen failed. Actual Error Code: " << err << std::endl;
        return 1;
    }
    std::cout << "WinDivert handle opened successfully!" << std::endl;
    WinDivertClose(handle);
    return 0;
}
