import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

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
        is_admin BOOLEAN DEFAULT FALSE,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed admin user or update password if exists
    const adminEmail = process.env.ADMIN_EMAIL || "dipikaacharya53@gmail.com";
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const [existingAdmins] = await connection.execute("SELECT id FROM user_details WHERE email = ?", [adminEmail]);

    if ((existingAdmins as any).length === 0) {
      await connection.execute(
        "INSERT INTO user_details (name, email, password, is_admin) VALUES (?, ?, ?, TRUE)",
        ["Admin", adminEmail, hashedPassword]
      );
      console.log(`🌱 Seeded new admin user: ${adminEmail} (password: admin123)`);
    } else {
      await connection.execute(
        "UPDATE user_details SET password = ?, is_admin = TRUE WHERE email = ?",
        [hashedPassword, adminEmail]
      );
      console.log(`🔄 Updated existing admin user password: ${adminEmail} (password: admin123)`);
    }

    // Ensure columns exist for existing tables
    const addColumn = async (table: string, column: string, definition: string) => {
      try {
        await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`✅ Added column ${column} to ${table}`);
      } catch (e: any) {
        if (e.errno === 1060) {
          // Duplicate column name, ignore
        } else {
          console.error(`❌ Error adding column ${column} to ${table}:`, e);
        }
      }
    };

    await addColumn("user_details", "is_admin", "BOOLEAN DEFAULT FALSE");
    await addColumn("user_details", "last_active_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS download_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        downloaded_by VARCHAR(255) NOT NULL,
        downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resume_name VARCHAR(255),
        certificate_name VARCHAR(255)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS certificates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        issuer VARCHAR(255) NOT NULL,
        year VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS resumes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Seed initial certificates if empty
    const [certs] = await connection.execute("SELECT COUNT(*) as count FROM certificates");
    if ((certs as any)[0].count === 0) {
      await connection.execute(`
        INSERT INTO certificates (title, issuer, year, filename, path) VALUES 
        ('Scrum Master Certification', 'Vipesh Singla, UDEMY', '2025', 'scrum_master_cert.pdf', '/certificates/scrum_master_cert.pdf'),
        ('Executive Presence: Confident Leadership', 'MTF Institute, UDEMY', '2025', 'executive_presence_cert.pdf', '/certificates/executive_presence_cert.pdf'),
        ('Master Java from scratch', 'UDEMY', '2025', 'java_mastery_cert.pdf', '/certificates/java_mastery_cert.pdf')
      `);
      console.log("🌱 Seeded initial certificates");
    }

    // Seed initial resumes if empty
    const [existingResumes] = await connection.execute("SELECT COUNT(*) as count FROM resumes");
    if ((existingResumes as any)[0].count === 0) {
      await connection.execute(`
        INSERT INTO resumes (title, description, filename, path) VALUES 
        ('Full-Stack Developer Resume', 'Focuses on technical skills in React, Node.js, and Database management.', 'Dipika_Acharya_Tech_Resume.pdf', '/resumes/Dipika_Acharya_Tech_Resume.pdf'),
        ('Data Analyst Resume', 'Highlights skills in SQL, Python, Power BI, and User Behavior analysis.', 'Dipika_Acharya_Data_Resume.pdf', '/resumes/Dipika_Acharya_Data_Resume.pdf')
      `);
      console.log("🌱 Seeded initial resumes");
    }

    console.log("✅ Database tables ready in 'dipika'");

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
