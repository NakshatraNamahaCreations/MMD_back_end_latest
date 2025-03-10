import axios from "axios";
import dotenv from "dotenv";
// import config from "../config/env.js";
dotenv.config({ path: "../../.env" });

export const sendMessage = async (req, res) => {
  try {
    const { mobile, name, var1, service } = req.body;

    if (!mobile) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Mobile number is required.",
      });
    }


    let templateId;
    switch (service) {
      case "Pancard":
        templateId = process.env.MSG91_TEMPLATE_PAN;
        break;
      case "SeniorCitizen":
        
        templateId = process.env.MSG91_TEMPLATE_SENIOR;
        break;
      default:
        templateId = process.env.MSG91_TEMPLATE_DEFAULT; 
    }

    if (!templateId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "No template ID found for the provided service.",
      });
    }

    const url = "https://api.msg91.com/api/v5/flow/";
    const payload = {
      flow_id: templateId,
      sender: process.env.MSG91_SENDER_ID,
      mobiles: mobile,
      name: name || "Customer",
      var1: var1 || "",
    };

    const headers = {
      authkey: process.env.MSG91_AUTH_KEY,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, payload, { headers });
    return res.json({ status: response.status, response: response.data });
  } catch (error) {
    console.error("Error sending SMS:", error.response?.data || error.message);
    return res.status(500).json({
      status: "error",
      message: "Failed to send SMS",
      error: error.message,
    });
  }
};
export const sendPanMessage = async (req, res) => {
  try {
    const { mobile, var1, var2 } = req.body;

    if (!mobile) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Mobile number is required.",
      });
    }

    const payload = {
      flow_id: "6753ce34d6fc05394d234772",
      sender: process.env.MSG91_SENDER_ID,
      mobiles: mobile,
      var1: var1 || "",
      var2: var2 || "",
    };

    const headers = {
      authkey: process.env.MSG91_AUTH_KEY,
      "Content-Type": "application/json",
    };

    const response = await axios.post(
      "https://api.msg91.com/api/v5/flow/",
      payload,
      { headers }
    );

    return res.json({
      status: response.status,
      response: response.data,
    });
  } catch (error) {
    console.error("Error sending SMS:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to send SMS",
      error: error.message,
    });
  }
};

export const getSMSLogs = async (req, res) => {
  try {
    const logs = await SMSLog.find().sort({ createdAt: -1 });
    res.json({ status: "success", logs });
  } catch (error) {
    console.error("Error fetching SMS logs:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

export const sentSeniorCitzen = async (req, res) => {
  try {
    const { mobile, var1, var2 } = req.body;

    if (!mobile) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Mobile number is required.",
      });
    }

    const payload = {
      flow_id: "67540ea7d6fc05611c583b32",
      sender: process.env.MSG91_SENDER_ID,
      mobiles: mobile,
      var1: var1 || "https://wa.me/9980097315",
      var2: var2 || "your scheduled time",
    };

    const headers = {
      authkey: process.env.MSG91_AUTH_KEY,
      "Content-Type": "application/json",
    };

    const response = await axios.post(
      "https://api.msg91.com/api/v5/flow/",
      payload,
      { headers }
    );

    return res.json({
      status: response.status,
      response: response.data,
    });
  } catch (error) {
    console.error("Error sending SMS:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to send SMS",
    });
  }
};
