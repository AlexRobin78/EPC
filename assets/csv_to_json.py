import csv
import json

def main():
    res = dict()

    with open('epc_positions.csv', 'r') as csvfile:
        csv_reader = csv.reader(csvfile)
        for row in csv_reader:
            if row[0] == "ID":
                continue
            inner_dict = dict()
            inner_dict["IS_COMMON_POSITION"] = row[1]
            inner_dict["EPC"] = row[2]
            inner_dict["VARIANCE"] = row[3]
            inner_dict["METHOD"] = row[4]
            inner_dict["BESTIMATE"] = row[5]
            inner_dict["FASTIMATE"] = row[6]
            inner_dict["DIFFERENCE"] = row[7]
            res[row[0]] = inner_dict

    with open("epc_positions.json", "w") as json_file:
        json.dump(res, json_file, indent=4)

if __name__ == "__main__":
    main()
