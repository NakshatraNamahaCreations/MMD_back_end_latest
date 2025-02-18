import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  custId: { type: String, required: true },
  industryTypeId: { type: String, required: true },
  channelId: { type: String, required: true },
  txnAmount: { type: String, required: true },
  service: { type: String, required: true },
  checksumHash: { type: String, required: true },
  paymentStatus: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now }
});

const Payments=  mongoose.model("Payment", PaymentSchema);
export default Payments;
