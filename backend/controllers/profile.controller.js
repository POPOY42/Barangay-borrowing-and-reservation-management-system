import User from "../models/User.model.js";

const EDITABLE_FIELDS = ["phoneNumber", "birthday", "houseNumber", "purok"];
const PHONE_PATTERN = /^(09|\+639)\d{9}$/;
const NOTIFICATION_FIELDS = [
    "borrowingUpdates",
    "reservationUpdates",
    "announcements",
];

const notificationResponse = (user) => ({
    borrowingUpdates: user.notificationPreferences?.borrowingUpdates ?? true,
    reservationUpdates: user.notificationPreferences?.reservationUpdates ?? true,
    announcements: user.notificationPreferences?.announcements ?? true,
});

const profileResponse = (user) => ({
    id: user._id,
    firstName: user.firstName,
    middleName: user.middleName || "",
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber || "",
    birthday: user.birthday || null,
    houseNumber: user.houseNumber || "",
    purok: user.purok || "",
    role: user.role,
});

const validateOptionalString = (value, fieldLabel, maximumLength) => {
    if (typeof value !== "string") {
        return `${fieldLabel} must be a string.`;
    }

    if (value.trim().length > maximumLength) {
        return `${fieldLabel} must not exceed ${maximumLength} characters.`;
    }

    return "";
};

const parseBirthday = (value) => {
    if (value === "" || value === null) {
        return { birthday: null };
    }

    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { error: "Birthday must be a valid date." };
    }

    const birthday = new Date(`${value}T00:00:00.000Z`);

    if (
        Number.isNaN(birthday.getTime()) ||
        birthday.toISOString().slice(0, 10) !== value
    ) {
        return { error: "Birthday must be a valid date." };
    }

    const todayParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const datePart = (type) => todayParts.find((part) => part.type === type)?.value;
    const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;

    if (value > today) {
        return { error: "Birthday cannot be in the future." };
    }

    return { birthday };
};

const getMyProfile = async (req, res) => {
    return res.status(200).json({
        user: profileResponse(req.user),
    });
};

const updateMyProfile = async (req, res) => {
    try {
        const requestBody = req.body || {};
        const requestedFields = Object.keys(requestBody);
        const unsupportedFields = requestedFields.filter(
            (field) => !EDITABLE_FIELDS.includes(field)
        );

        if (unsupportedFields.length > 0) {
            return res.status(400).json({
                message:
                    "Only phone number, birthday, house number, and purok can be updated.",
            });
        }

        if (requestedFields.length === 0) {
            return res.status(400).json({
                message: "Provide at least one profile field to update.",
            });
        }

        const updates = {};

        if (Object.hasOwn(requestBody, "phoneNumber")) {
            const error = validateOptionalString(
                requestBody.phoneNumber,
                "Phone number",
                13
            );
            const phoneNumber = typeof requestBody.phoneNumber === "string"
                ? requestBody.phoneNumber.trim()
                : "";

            if (error) return res.status(400).json({ message: error });
            if (phoneNumber && !PHONE_PATTERN.test(phoneNumber)) {
                return res.status(400).json({
                    message: "Please enter a valid PH phone number.",
                });
            }

            updates.phoneNumber = phoneNumber;
        }

        if (Object.hasOwn(requestBody, "houseNumber")) {
            const error = validateOptionalString(
                requestBody.houseNumber,
                "House number",
                50
            );
            if (error) return res.status(400).json({ message: error });
            updates.houseNumber = requestBody.houseNumber.trim();
        }

        if (Object.hasOwn(requestBody, "purok")) {
            const error = validateOptionalString(requestBody.purok, "Purok", 100);
            if (error) return res.status(400).json({ message: error });
            updates.purok = requestBody.purok.trim();
        }

        if (Object.hasOwn(requestBody, "birthday")) {
            const result = parseBirthday(requestBody.birthday);
            if (result.error) {
                return res.status(400).json({ message: result.error });
            }
            updates.birthday = result.birthday;
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        Object.assign(user, updates);
        await user.save();

        return res.status(200).json({
            message: "Profile updated successfully.",
            user: profileResponse(user),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to update profile.",
        });
    }
};

const changePassword = async (req, res) => {
    try {
        const requestBody = req.body || {};
        const allowedFields = ["currentPassword", "newPassword", "confirmNewPassword"];
        if (Object.keys(requestBody).some((field) => !allowedFields.includes(field))) {
            return res.status(400).json({
                message: "Only current password and new password fields are allowed.",
            });
        }

        const { currentPassword, newPassword, confirmNewPassword } = requestBody;
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ message: "All password fields are required." });
        }
        if (typeof currentPassword !== "string" || typeof newPassword !== "string" ||
            typeof confirmNewPassword !== "string") {
            return res.status(400).json({ message: "Password fields must be valid text." });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters.",
            });
        }
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: "New passwords do not match." });
        }
        if (newPassword === currentPassword) {
            return res.status(400).json({
                message: "New password must be different from your current password.",
            });
        }

        const user = await User.findById(req.user._id).select("+password");
        if (!user) return res.status(404).json({ message: "User not found." });

        if (!await user.comparePassword(currentPassword)) {
            return res.status(400).json({ message: "Current password is incorrect." });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({ message: "Password changed successfully." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to change password." });
    }
};

const getNotificationPreferences = async (req, res) => {
    return res.status(200).json({
        notificationPreferences: notificationResponse(req.user),
    });
};

const updateNotificationPreferences = async (req, res) => {
    try {
        const requestBody = req.body || {};
        const requestedFields = Object.keys(requestBody);
        if (requestedFields.length === 0) {
            return res.status(400).json({
                message: "Provide at least one notification preference to update.",
            });
        }
        if (requestedFields.some((field) => !NOTIFICATION_FIELDS.includes(field))) {
            return res.status(400).json({
                message: "The request contains unsupported notification preferences.",
            });
        }
        if (requestedFields.some((field) => typeof requestBody[field] !== "boolean")) {
            return res.status(400).json({
                message: "Notification preferences must be true or false.",
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found." });

        user.notificationPreferences = {
            ...notificationResponse(user),
            ...requestBody,
        };
        await user.save();

        return res.status(200).json({
            message: "Notification preferences saved successfully.",
            notificationPreferences: notificationResponse(user),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to update notification preferences.",
        });
    }
};

export {
    changePassword,
    getMyProfile,
    getNotificationPreferences,
    updateMyProfile,
    updateNotificationPreferences,
};
