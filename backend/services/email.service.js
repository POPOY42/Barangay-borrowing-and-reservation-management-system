import { BrevoClient } from "@getbrevo/brevo";

class EmailDeliveryError extends Error {
    constructor(message = "Email delivery failed.") {
        super(message);
        this.name = "EmailDeliveryError";
        this.code = "EMAIL_DELIVERY_FAILED";
    }
}

const createEmailSender = (client, senderEmail, senderName) => async (to, subject, html) => {
    if (!senderEmail || !senderName) {
        console.error("Email delivery configuration error: sender details are missing.", {
            emailFromConfigured: Boolean(senderEmail),
            emailFromNameConfigured: Boolean(senderName),
        });
        throw new EmailDeliveryError();
    }

    try {
        const result = await client.transactionalEmails.sendTransacEmail({
            sender: {
                email: senderEmail,
                name: senderName,
            },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        });

        if (!result?.messageId) {
            console.error("Brevo accepted an email request without returning a message ID.");
            throw new EmailDeliveryError();
        }

        return result;
    } catch (error) {
        if (error instanceof EmailDeliveryError) throw error;

        console.error("Brevo email request failed.", {
            name: error?.name,
            message: error?.message,
            statusCode: error?.statusCode,
        });
        throw new EmailDeliveryError();
    }
};

const sendEmail = async (to, subject, html) => {
    if (!process.env.BREVO_API_KEY) {
        console.error("Email delivery configuration error: BREVO_API_KEY is missing.");
        throw new EmailDeliveryError();
    }

    const client = new BrevoClient({
        apiKey: process.env.BREVO_API_KEY,
        timeoutInSeconds: 15,
        maxRetries: 2,
    });

    return createEmailSender(
        client,
        process.env.EMAIL_FROM,
        process.env.EMAIL_FROM_NAME,
    )(to, subject, html);
};

export { createEmailSender, EmailDeliveryError };
export default sendEmail;
