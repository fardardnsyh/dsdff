import mongoose from "mongoose";


const chatSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    history: [
        //inside AI text data has role and parts as default
        {
            role: {
                type: String,
                enum: ["user", "model"],
                required: true
            },
            parts: [
                {
                    text: {
                        type: String,
                        required: true
                    }

                }
            ],
            img: {
                type: String,
                required: false
            }
        }
    ] 
}, 
{timestamps: true}
);

export default mongoose.models.chat || mongoose.model("chat", chatSchema);