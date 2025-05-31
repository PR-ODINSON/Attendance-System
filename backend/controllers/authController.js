import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import dbService from "../dbService.js";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const uploadDir = "uploads";

export const registerUser = async (req, res) => {
    try {
        const { name, email, phone, department, designation, password, employee_id } = req.body;

        // Create a folder for the employee
        const employeeDir = path.join(uploadDir, name);
        if (!fs.existsSync(employeeDir)) {
            fs.mkdirSync(employeeDir, { recursive: true });
        }

        // Move uploaded files
        const profilePhotos = req.files.map((file, index) => {
            const ext = path.extname(file.originalname);
            const newFileName = `${name}_${index}${ext}`;
            const newFilePath = path.join(employeeDir, newFileName);
            fs.renameSync(file.path, newFilePath);
            return newFileName;
        });

        // Check if already exists
        const existingUser = await dbService.select("users", "id", { email });
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await dbService.insert("users", {
            employee_id,
            name,
            email,
            phone,
            department,
            designation,
            profilePhoto: JSON.stringify(profilePhotos),
            password: hashedPassword,
            created_at: new Date()
        });

        if (!result.affectedRows) {
            return res.status(500).json({ error: "Failed to register user" });
        }

        // JWT
        const token = jwt.sign({ email, employee_id, designation }, JWT_SECRET);
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.status(201).json({ message: "Registration Successful", designation, email });

        console.log("Embeddings creation started...");

        // Trigger embeddings
        const scriptPath = "C:/Users/ayaan/OneDrive/Desktop/IITRAM/InSolare Project/New attendance git/flaskServer/createEmbeddings.py";
        const uploadFolder = path.join("uploads", name);
        const command = `python "${scriptPath}" "${uploadFolder}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`[Embedding Error]: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`[Embedding stderr]: ${stderr}`);
            }
            console.log(`[Embeddings Log]: ${stdout}`);
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const users = await dbService.select("users", ["id", "email", "password", "designation"], {
            email: email
        });

        if (!users || users.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = users.data[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign({ email: user.email, userid: user.id, designation: user.designation }, process.env.JWT_SECRET);
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.status(200).json({ message: "Login Successful", designation: user.designation, email: user.email, userid: user.id });
    } catch (error) {
        console.error("Error in login:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const logoutUser = (req, res) => {
    try {
        res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ error: "Logout failed" });
    }
};
