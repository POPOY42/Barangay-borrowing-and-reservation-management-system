import barangayLogo from "../assets/san rafael logo.jpg";
import "../css/brandLogo.css";

const BrandLogo = ({ className = "", alt = "Barangay San Rafael official logo" }) => (
    <img
        className={`system-brand-logo ${className}`.trim()}
        src={barangayLogo}
        alt={alt}
    />
);

export default BrandLogo;
