"""
Script to make a user an admin
"""
import sqlite3

# Connect to the database
conn = sqlite3.connect('qcloud.db')
cursor = conn.cursor()

# First, add the is_admin column if it doesn't exist
try:
    cursor.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0")
    print("Added is_admin column to users table")
except sqlite3.OperationalError as e:
    if "duplicate column" in str(e).lower():
        print("is_admin column already exists")
    else:
        raise

# Update the user to be admin
email = "yezhuoyang@cs.ucla.edu"
cursor.execute("UPDATE users SET is_admin = 1 WHERE email = ?", (email,))

if cursor.rowcount > 0:
    print(f"Successfully made user with email '{email}' an admin!")
else:
    print(f"No user found with email '{email}'")

conn.commit()
conn.close()
