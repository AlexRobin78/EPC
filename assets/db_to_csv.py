import sqlite3
import csv

def sqlite_to_csv(database_file, table_name, output_csv_file):
    """
    Converts a table from an SQLite database to a CSV file.

    Args:
        database_file (str): Path to the SQLite database file.
        table_name (str): Name of the table to export.
        output_csv_file (str): Path for the output CSV file.
    """
    try:
        conn = sqlite3.connect(database_file)
        cursor = conn.cursor()

        # Get column names for CSV header
        cursor.execute(f"PRAGMA table_info({table_name});")
        column_names = [column[1] for column in cursor.fetchall()]

        # Select all data from the specified table
        cursor.execute(f"SELECT * FROM {table_name};")
        rows = cursor.fetchall()

        with open(output_csv_file, 'w', newline='', encoding='utf-8') as csvfile:
            csv_writer = csv.writer(csvfile)
            csv_writer.writerow(column_names)  # Write header
            csv_writer.writerows(rows)         # Write data rows

        print(f"Successfully exported table '{table_name}' from '{database_file}' to '{output_csv_file}'.")

    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
    except IOError as e:
        print(f"File I/O error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

# Example usage:
def main():
    sqlite_to_csv('epc_positions.db', 'POSITIONS', 'epc_positions.csv')

if __name__ == "__main__":
    main()
