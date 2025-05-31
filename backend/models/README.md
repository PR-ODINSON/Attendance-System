# MySQL Migration Guide

This project has been migrated from Supabase to MySQL. Here's how to set up the MySQL database.

## Setup Instructions

1. Install MySQL if not already installed
2. Create a new database for the application
3. Run the schema script to create tables

```bash
# Log into MySQL
mysql -u root -p

# Create the database
CREATE DATABASE attendance_system;

# Exit MySQL
exit

# Import the schema
mysql -u root -p attendance_system < ./mysql/schema.sql
```

## Configuration

1. Copy the example environment file and update it with your MySQL details:

```bash
cp backend/env.example backend/.env
```

2. Edit the `.env` file with your MySQL credentials:

```
MYSQL_HOST=localhost
MYSQL_USER=your_mysql_username
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=attendance_system
```

## Data Migration

If you're migrating data from Supabase to MySQL, you'll need to:

1. Export your data from Supabase
2. Format it appropriately for MySQL
3. Import it into your MySQL database

```bash
# Import data (after formatting it correctly)
mysql -u root -p attendance_system < ./data_export.sql
```

## Running the Application

Once MySQL is set up:

```bash
# Install dependencies
cd backend
npm install

# Start the server
npm start
``` 