import Borrowing from "../models/Borrowing.model.js";

const createBorrowing = async (req,res) => {
    try {
        
        const userId = req.user._id;

        const { equipment, 
                quantity, 
                purpose, 
                borrowDate, 
                returnDate
        } = req.body
        
    } 
    
    catch (error) {
        
    }
}

export {
    createBorrowing
}