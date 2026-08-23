import { Resend } from "resend";

class EmailDeliveryError extends Error {
    constructor(message = "Email delivery failed.") {
        super(message);
        this.name = "EmailDeliveryError";
        this.code = "EMAIL_DELIVERY_FAILED";
    }
}

const createEmailSender = (client, fromAddress) => async (to, subject, html) => {
    if (!fromAddress) {
        console.error("Email delivery configuration error: EMAIL_FROM is missing.");
        throw new EmailDeliveryError();
    }

    try {
        const { data, error } = await client.emails.send({
            from: fromAddress,
            to: [to],
            subject,
            html,
        });

        if (error || !data?.id) {
            console.error("Resend rejected an email request.", {
                name: error?.name,
                message: error?.message,
                statusCode: error?.statusCode,
            });
            throw new EmailDeliveryError();
        }

        return data;
    } catch (error) {
        if (error instanceof EmailDeliveryError) throw error;

        console.error("Resend email request failed.", {
            name: error?.name,
            message: error?.message,
            statusCode: error?.statusCode,
        });
        throw new EmailDeliveryError();
    }
};

const sendEmail = async (to, subject, html) => {
    if (!process.env.RESEND_API_KEY) {
        console.error("Email delivery configuration error: RESEND_API_KEY is missing.");
        throw new EmailDeliveryError();
    }

    const client = new Resend(process.env.RESEND_API_KEY);
    return createEmailSender(client, process.env.EMAIL_FROM)(to, subject, html);
};

export { createEmailSender, EmailDeliveryError };
export default sendEmail;
