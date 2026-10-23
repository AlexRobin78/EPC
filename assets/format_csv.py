import csv

def main():
    with open("epc_positions.csv", 'r', newline='') as infile, \
     open("epc_positions_mod.csv", 'w', newline='') as outfile:
        reader = csv.reader(infile)
        writer = csv.writer(outfile)
        for row in reader:
            if row[5][0] == '\'':
                row[5] = row[5][1:]
            writer.writerow(row)

if __name__ == "__main__":
    main()
