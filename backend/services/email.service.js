import transporter from "../config/mailer.js";

const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: `"Barangay Borrowing System" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
    } catch (error) {
        console.error(error);
    }
};

export default sendEmail;