cmake_minimum_required(VERSION 3.16)
project(PacketAnalyzer VERSION 1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Source files
set(SOURCES
    engine/src/main.cpp
    engine/src/pcap_reader.cpp
    engine/src/packet_parser.cpp
)

# Header files location
include_directories(${CMAKE_SOURCE_DIR}/engine/include)

# Find WinDivert library
set(WINDIVERT_LIB ${CMAKE_SOURCE_DIR}/engine/lib/WinDivert.lib)

# Create the executable
add_executable(packet_analyzer ${SOURCES})

# Link WinDivert
target_link_libraries(packet_analyzer ${WINDIVERT_LIB} ws2_32)

# For macOS, we might need to link against system libraries later
if(APPLE)
    # Add any macOS-specific settings here
endif()
