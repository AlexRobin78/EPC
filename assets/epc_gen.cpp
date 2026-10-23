#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <numeric>
#include <chrono>
#include <fstream>
#include <iomanip>
#include <algorithm>

// Global structures to match Python's global scope
std::vector<std::vector<int>> rolls;
std::unordered_map<std::string, double> EPC_MAP = {{"0000000", 0.0}};
const double ROLL_PIPS = 294.0 / 36.0;

// Forward declaration of dp_func
double dp_func(const std::vector<int>& p);

// Helper to convert a vector of ints into a Hex string
std::string listToStr(const std::vector<int>& L) {
    std::string s = "";
    for (int num : L) {
        if (num >= 0 && num <= 15) {
            // Converts 0-15 to '0'-'F'
            s += (num < 10) ? (char)('0' + num) : (char)('A' + (num - 10));
        }
    }
    return s;
}

// Finds the first index in the vector that isn't 0
int first_nonzero_index(const std::vector<int>& p) {
    for (int i = 0; i < 7; ++i) {
        if (p[i] != 0) return i;
    }
    return -1;
}

// Recursive exploration function
double explore(const std::vector<int>& root_p, const std::vector<int>& p, const std::vector<int>& roll, size_t turn) {
    // Check if p is all zeros
    bool all_zero = true;
    for (int val : p) {
        if (val != 0) {
            all_zero = false;
            break;
        }
    }

    if (turn >= roll.size() || all_zero) {
        std::string p_str = listToStr(p);
        if (EPC_MAP.find(p_str) == EPC_MAP.end()) {
            return dp_func(p) + ROLL_PIPS;
        } else {
            return EPC_MAP[p_str] + ROLL_PIPS;
        }
    }

    double min_epc = 1000.0;
    int die = roll[turn];

    for (int i = 0; i <= 7 - die; ++i) {
        std::vector<int> new_p = p;
        if (new_p[i] > 0) {
            new_p[i] -= 1;
            if (i < 7 - die) {
                new_p[i + die] += 1;
            }
            min_epc = std::min(min_epc, explore(root_p, new_p, roll, turn + 1));
        }
    }

    if (min_epc == 1000.0) {
        std::vector<int> new_p = p;
        int idx = first_nonzero_index(p);
        if (idx != -1) {
            new_p[idx] -= 1;
        }
        min_epc = explore(root_p, new_p, roll, turn + 1);
    }

    return min_epc;
}

// Memoized DP function
double dp_func(const std::vector<int>& p) {
    std::string p_str = listToStr(p);
    if (EPC_MAP.find(p_str) != EPC_MAP.end()) {
        return EPC_MAP[p_str];
    }

    double average_epc = 0.0;
    for (const auto& r : rolls) {
        double epc = explore(p, p, r, 0);
        if (r.size() == 2) {
            epc *= 2.0;
        }
        average_epc += epc;
    }

    double true_epc = average_epc / 36.0;
    EPC_MAP[p_str] = true_epc;
    return true_epc;
}

// C++ equivalent of Python's itertools.combinations to generate partitions
void generate_partitions(int n, int k, int current_sum, int index, std::vector<int>& current_partition) {
    if (index == k - 1) {
        current_partition[index] = n - current_sum;
        dp_func(current_partition);
        return;
    }

    for (int i = 0; i <= n - current_sum; ++i) {
        current_partition[index] = i;
        generate_partitions(n, k, current_sum + i, index + 1, current_partition);
    }
}

int main() {
    // Populate the rolls vector
    for (int i = 1; i <= 6; ++i) {
        for (int j = i; j <= 6; ++j) {
            if (i == j) {
                rolls.push_back({i, i, i, i});
            } else {
                rolls.push_back({j, i});
            }
        }
    }

    // Loop through sizes 0 to 15
    for (int i = 0; i < 16; ++i) {
        auto start_time = std::chrono::high_resolution_clock::now();
        
        std::vector<int> current_partition(7, 0);
        generate_partitions(i, 7, 0, 0, current_partition);
        
        auto end_time = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double> execution_time = end_time - start_time;
        
        std::cout << i << " Execution time: " << std::fixed << std::setprecision(6) 
                  << execution_time.count() << " seconds" << std::endl;
    }

    // Write results to the file
    std::ofstream f("epc_vals_extended.txt");
    if (f.is_open()) {
        for (const auto& pair : EPC_MAP) {
            f << pair.first << ": " << std::fixed << std::setprecision(2) << pair.second << "\n";
        }
        f.close();
    }

    return 0;
}