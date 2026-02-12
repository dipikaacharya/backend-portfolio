import mysql from "mysql2/promise";

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: "dipika",
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
});

export async function initDB(): Promise<void> {
    try {
        const connection = await pool.getConnection();
        console.log(`✅ Connected to Aiven MySQL database: dipika`);

        await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log("✅ 'user_details' table ready in 'dipika' database");

        connection.release();
    } catch (error: any) {
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.error("❌ Database 'dipika' does not exist. Please create it in your Aiven console or ensure your user has permissions to create databases.");
        } else {
            console.error("❌ Database initialization failed:", error);
        }
        throw error;
    }
}

export default pool;
