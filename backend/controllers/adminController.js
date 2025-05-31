import dbService from "../dbService.js";

export const getAllAdmins = async (req, res) => {
    try {
        const admins = await dbService.select("users", ["id", "name", "email", "designation"], {
            designation: "admin"
        });

        res.status(200).json(admins.data || []);
    } catch (error) {
        console.error("Error fetching admins:", error);
        res.status(500).json({ error: "Failed to fetch admins" });
    }
};

export const registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        await dbService.insert("users", {
            name,
            email,
            password: hashedPassword,
            designation: "admin"
        });

        res.status(201).json({ message: "Admin registered successfully" });
    } catch (error) {
        console.error("Error registering admin:", error);
        res.status(500).json({ error: "Admin registration failed" });
    }
};
