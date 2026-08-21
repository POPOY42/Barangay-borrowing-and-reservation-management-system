import { randomInt } from "node:crypto";

const OTP_EXPIRATION_MS = 5 * 60 * 1000;

const generateOTP = () => {
    return randomInt(100000, 1000000).toString();
};

const getOtpExpiration = () => new Date(Date.now() + OTP_EXPIRATION_MS);

export { getOtpExpiration, OTP_EXPIRATION_MS };
export default generateOTP;
