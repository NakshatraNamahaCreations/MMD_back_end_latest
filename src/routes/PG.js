import PaytmChecksum from "paytmchecksum";
import PaymentModel from "../models/PG.js"; // Ensure your model is correctly imported
import express from "express";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
const router = express.Router();
import Lead from "../models/Lead.js";
import axios from "axios";
import User from "../models/User.js";

dotenv.config({ path: "../../.env" });

// Paytm Config
const paytmConfig = {
  MID: "MAKEMY09422872921500",
  MERCHANT_KEY: "Wi%SmC%mkRR%jP8M",
  WEBSITE: "DEFAULT",
  INDUSTRY_TYPE_ID: "Retail",
  CHANNEL_ID: "WEB",
  CALLBACK_URL: "https://api.makemydocuments.in/api/PG/paytm/callback",

};

router.post("/paytm/initiate", async (req, res) => {
  try {
    const { CUST_ID, TXN_AMOUNT, SERVICE, ORDER_ID } = req.body;

    if (!CUST_ID || !TXN_AMOUNT || !SERVICE || !ORDER_ID) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing required parameters" });
    }
    const transaction = await Lead.findOne({ orderId: ORDER_ID }); 

    let paramList = {
      MID: paytmConfig.MID,
      ORDER_ID: ORDER_ID, 
      CUST_ID: CUST_ID,
      INDUSTRY_TYPE_ID: paytmConfig.INDUSTRY_TYPE_ID,
      CHANNEL_ID: paytmConfig.CHANNEL_ID,
      TXN_AMOUNT: TXN_AMOUNT,
      WEBSITE: paytmConfig.WEBSITE,
      CALLBACK_URL: `${paytmConfig.CALLBACK_URL}?orderid=${ORDER_ID}&service=${SERVICE}`,
    };

    console.log("Param List Before Checksum:", paramList);

    const checksum = await PaytmChecksum.generateSignature(
      paramList,
      paytmConfig.MERCHANT_KEY
    );
    paramList.CHECKSUMHASH = checksum;

    res.json({
      status: "success",
      ORDER_ID,
      CHECKSUMHASH: checksum,
      paramList,
    });
  } catch (error) {
    console.error("Error initiating Paytm payment:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

router.post("/paytm/callback", async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Empty callback response." });
    }

    const { CHECKSUMHASH, ...paramList } = req.body;
    const { ORDERID } = req.body;

    const orderid = ORDERID;
    const service = req.query.service;

    if (!CHECKSUMHASH) {
      console.error("Missing CHECKSUMHASH in response.");
      return res.status(400).json({
        success: false,
        message: "Missing CHECKSUMHASH in callback response.",
      });
    }

    // Ensure MERCHANT_KEY is defined
    if (!paytmConfig.MERCHANT_KEY) {
      console.error("Paytm MERCHANT_KEY is not defined.");
      return res
        .status(500)
        .json({ success: false, message: "Paytm configuration error" });
    }

    // Verify checksum using Paytm's library
    const isValidChecksum = await PaytmChecksum.verifySignature(
      paramList,
      paytmConfig.MERCHANT_KEY,
      CHECKSUMHASH
    );
    if (!isValidChecksum) {
      console.error("Checksum verification failed.");
      return res
        .status(400)
        .json({ success: false, message: "Checksum verification failed." });
    }

    const paymentStatus =
      paramList.STATUS === "TXN_SUCCESS" ? "PAID" : "UNPAID";

    if (!orderid) {
      console.error("Order ID is missing.");
      return res
        .status(400)
        .json({ success: false, message: "Order ID is missing." });
    }

    // Update transaction status in MongoDB
    const transaction = await Lead.findOneAndUpdate(
      { orderId: orderid },
      { paymentStatus },
      { new: true }
    );
    if (!transaction) {
      console.error(`Transaction not found for Order ID: ${orderid}`);
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found." });
    }
    // // if (paymentStatus === "PAID") {
    // console.log("Preparing SMS Payload...");

    // try {
    //   const smsPayload = {
    //     mobile: `917605968434`,
    //     name: "Customer",
    //     // var1: orderid,
    //     // var2: service,
    //   };

    //   console.log("Sending SMS with payload:", smsPayload);

    //   const smsResponse = await axios.post(
    //     "http://localhost:9000/api/send-sms",
    //     smsPayload,
    //     {
    //       headers: {
    //         authkey: process.env.MSG91_AUTH_KEY,
    //         "Content-Type": "application/json",
    //       },
    //     }
    //   );

    //   console.log("SMS Sent Successfully:", smsResponse.data);
    // } catch (smsError) {
    //   console.error(
    //     "SMS Sending Failed:",
    //     smsError.response?.data || smsError.message
    //   );
    // }
     const transporter = nodemailer.createTransport({
       host: "smtp.zoho.com",
       port: 465,
       secure: true,
       auth: {
           user: "support@makemydocuments.com", 
           pass: "C80Y4z2uCJcd", 
       },
       tls: {
           rejectUnauthorized: false, 
       },
   });

    if (paymentStatus === "PAID") {
      try {
        const transaction = await Lead.findOne({ orderId: orderid });
        let serviceMessage = "";
        let documentUploadLink = "https://m.9m.io/MMDOCS/bjs4bd6"; 
    

        switch (service) {
          case "SeniorCitizen":
            serviceMessage = `We have received your Senior Citizen Card application. Please upload your documents via WhatsApp for eKYC and eSign to process further.`;
            break;
          case "Pancard":
            serviceMessage = `We have received your PAN card application. Please upload your documents via WhatsApp for eKYC and eSign to process further.`;
            break;
          default:
            serviceMessage = `We have received your request. One of our executive will get back to you shortly. For any queries please call: 9429690973`;
        }
    
       
          const mailOptions = {
            from: `"Support Team" <support@makemydocuments.com>`, 
            to: transaction.email,
            subject: "Payment Successful - MakeMyDocuments",
            html: `
          <h2>Payment Confirmation</h2>
          <p>Dear ${transaction.name || "Customer"},</p>
          <p>${serviceMessage}</p>
          <p><a href="${documentUploadLink}" style="color: blue; font-weight: bold;">Upload Documents</a></p>
          <p>Thank you for choosing MakeMyDocuments.</p>
          <br>
          <p>Best Regards,<br>MakeMyDocuments Team</p>
        `,
         
          };
    
          await transporter.sendMail(mailOptions);
     
        const smsPayload = {
          mobile: `91${transaction.mobilenumber}`,
          name: transaction ? transaction.name : "Customer",
          var1: "https://m.9m.io/MMDOCS/bjs4bd6",
          service:service
        };
        const smsResponse = await axios.post(
          "https://api.makemydocuments.in/api/send-sms",
          smsPayload,
          {
            headers: {
              "Content-Type": "application/json",
              authkey: process.env.MSG91_AUTH_KEY,
            },
          }
        );
      } catch (smsError) {
        console.error(
          "SMS Sending Failed:",
          smsError.response?.data || smsError.message
        );
      }
    }

    // if (paymentStatus === "PAID") {
    //     try {

    //         const smsPayload = {
    //             mobile: "7605968434",
    //             name: user.name || "Customer",
    //             service: service,
    //             orderid: orderid,
    //         };
    //         const response = await axios.post(`http://localhost:9000/api/send-sms?service=${service}`,smsPayload);

    //         console.log("SMS Sent Successfully:", response.data);

    //     } catch (smsError) {
    //         console.error("SMS Sending Failed:", smsError.response?.data || smsError.message);
    //     }
    // }
    console.log(
      `Payment status updated to ${paymentStatus} for Order ID: ${orderid}`
    );

    const successRedirectURL = `https://makemydocuments.in/request_success?service=${service}`;
    const failureRedirectURL = `https://makemydocuments.in/failure?service=${service}`;

    return res.redirect(
      paymentStatus === "PAID" ? successRedirectURL : failureRedirectURL
    );
  } catch (error) {
    console.error("Error processing Paytm callback:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

export default router;
