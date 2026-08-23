import assert from "node:assert/strict";
import test from "node:test";
import Announcement from "../models/Announcement.model.js";
import Facility from "../models/Facility.model.js";
import Reservation from "../models/Reservation.model.js";
import { validateSchedule } from "../controllers/reservation.controller.js";
import { createEmailSender } from "../services/email.service.js";
import { escapeRegex, parsePagination } from "../utils/queryHelpers.js";

const futureDate = () => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const today = new Date(`${formatter.format(new Date())}T00:00:00.000Z`);
    today.setUTCDate(today.getUTCDate() + 1);
    return today.toISOString().slice(0, 10);
};

test("pagination enforces the shared bounds and calculates MongoDB skip", () => {
    assert.deepEqual(parsePagination({}), { page: 1, limit: 10, skip: 0 });
    assert.equal(parsePagination({ page: "0" }).error.length > 0, true);
    assert.equal(parsePagination({ limit: "101" }).error.length > 0, true);
    assert.deepEqual(parsePagination({ page: "3", limit: "25" }), {
        page: 3,
        limit: 25,
        skip: 50,
    });
});

test("search input is escaped before it is used in a regular expression", () => {
    assert.equal(escapeRegex("chair (large)+"), "chair \\(large\\)\\+");
});

test("facility model rejects invalid capacity and status", async () => {
    const invalidFacility = new Facility({
        facilityName: "Covered Court",
        category: "Court",
        capacity: 0,
        status: "closed",
    });

    await assert.rejects(invalidFacility.validate(), /Capacity|status/);
});

test("reservation schedule enforces date and 24-hour time rules", () => {
    const date = futureDate();
    assert.equal(validateSchedule({
        purpose: "Community meeting",
        reservationDate: date,
        startTime: "10:00",
        endTime: "12:00",
    }).error, undefined);
    assert.match(validateSchedule({
        purpose: "Community meeting",
        reservationDate: date,
        startTime: "12:00",
        endTime: "12:00",
    }).error, /after start time/);
    assert.match(validateSchedule({
        purpose: "Community meeting",
        reservationDate: date,
        startTime: "25:00",
        endTime: "26:00",
    }).error, /HH:MM/);
});

test("reservation and announcement models reject unsupported statuses", async () => {
    const reservation = new Reservation({
        user: "507f1f77bcf86cd799439011",
        facility: "507f1f77bcf86cd799439012",
        purpose: "Meeting",
        reservationDate: new Date(),
        startTime: "09:00",
        endTime: "10:00",
        status: "borrowed",
    });
    const announcement = new Announcement({
        title: "Notice",
        content: "Details",
        status: "archived",
        createdBy: "507f1f77bcf86cd799439011",
    });

    await assert.rejects(reservation.validate(), /status/);
    await assert.rejects(announcement.validate(), /status/);
});

test("email sender returns the provider message after Resend accepts it", async () => {
    let request;
    const client = {
        emails: {
            send: async (payload) => {
                request = payload;
                return { data: { id: "email_123" }, error: null };
            },
        },
    };
    const sendEmail = createEmailSender(
        client,
        "Barangay San Rafael <onboarding@resend.dev>",
    );

    const result = await sendEmail(
        "resident@example.com",
        "Verification code",
        "<p>123456</p>",
    );

    assert.equal(result.id, "email_123");
    assert.deepEqual(request, {
        from: "Barangay San Rafael <onboarding@resend.dev>",
        to: ["resident@example.com"],
        subject: "Verification code",
        html: "<p>123456</p>",
    });
});

test("email sender throws when Resend rejects the request", async () => {
    const client = {
        emails: {
            send: async () => ({
                data: null,
                error: {
                    name: "validation_error",
                    message: "Rejected",
                    statusCode: 422,
                },
            }),
        },
    };
    const sendEmail = createEmailSender(
        client,
        "Barangay San Rafael <onboarding@resend.dev>",
    );

    await assert.rejects(sendEmail("resident@example.com", "Subject", "<p>Body</p>"), {
        code: "EMAIL_DELIVERY_FAILED",
    });
});

test("email sender rejects missing sender configuration before calling Resend", async () => {
    let called = false;
    const client = {
        emails: {
            send: async () => {
                called = true;
                return { data: { id: "email_123" }, error: null };
            },
        },
    };
    const sendEmail = createEmailSender(client, "");

    await assert.rejects(sendEmail("resident@example.com", "Subject", "<p>Body</p>"), {
        code: "EMAIL_DELIVERY_FAILED",
    });
    assert.equal(called, false);
});
