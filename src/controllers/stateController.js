import Lead from "../models/Lead.js";
import User from "../models/User.js";
// import { validationResult } from "express-validator";

// import { formatDate, formatTime } from "../utils/helper.js";

export const updateLeadStatus = async (req, res) => {
  try {
    const { id, status } = req.body;

    // Validate input
    if (!id || !status) {
      return res.status(400).json({
        status: "error",
        message: "Lead ID and status are required",
      });
    }

    // Check if the status is valid
    const validStatuses = ["In Progress", "converted", "dead", "followup", "overdue"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: `Invalid status. Allowed statuses: ${validStatuses.join(
          ", "
        )}`,
      });
    }

    // Find and update the document
    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedLead) {
      return res.status(404).json({
        status: "error",
        message: "Lead not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Lead status updated successfully",
      lead: updatedLead,
    });
  } catch (error) {
    console.error("Error updating lead status:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
export const todayFollowUp = async (req, res) => {
  try {
    const { assign } = req.query;

    if (!assign) {
      return res
        .status(400)
        .json({ status: "error", message: "Assign query is required" });
    }

    // Fetch the user's role
    const user = await User.findOne({ name: assign });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "The Assign is Invalid or not found",
      });
    }

    let leads;
    let permission = "view-only";

    if (user.role === "admin") {
      leads = await Lead.find({
        status: "followup",
        followupDate: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999),
        },
      }).sort({ updated_by: -1 });
      permission = "full-access";
    } else {
      leads = await Lead.find({
        assign,
        status: "followup",
        followupDate: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lt: new Date().setHours(23, 59, 59, 999),
        },
      }).sort({ updated_by: -1 });
    }

    if (!leads || leads.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No results found for today",
        data: [],
      });
    }

    res.status(200).json({
      status: "success",
      message: "Data retrieved successfully",
      totalCount: leads.length,
      permission,
      data: leads,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getOverdueLead = async (req, res) => {
  try {
    const { assign } = req.query;

    if (!assign) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing 'assign' parameter" });
    }

    // Find user role
    const user = await User.findOne({ name: assign });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Invalid username or no data found",
      });
    }

    let leads;
    let permission = "view-only";
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); 
    if (user.role === "admin") {
      leads = await Lead.find({
        status: "followup",
        followupDate: { $exists: true, $ne: null, $lt: todayStart },
      });
      permission = "full-access";
    } else {
      leads = await Lead.find({
        $or: [
          { assign: assign },
          { assign: "Unassigned" }, 
          { assign: null },  
        ],
        status: "followup",
        followupDate: { $exists: true, $ne: null, $lt: new Date() },
      });
    }

    if (!leads || leads.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No results found for overdue",
        data: [],
      });
    }

    res.status(200).json({
      status: "success",
      message: "Data retrieved successfully",
      totalLength: leads.length,
      permission,
      data: leads,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getFollowups = async (req, res) => {
  try {
    let { assign } = req.query;

    if (!assign) {
      return res.status(400).json({
        status: "error",
        message: "Assign field is required",
      });
    }

    // Fetch the user role
    const user = await User.findOne({  name: assign });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Invalid username or no data found",
      });
    }

    let startOfTomorrow = new Date();
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    startOfTomorrow.setHours(0, 0, 0, 0);

    let endOfTomorrow = new Date(startOfTomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    let query = {
      status: "followup",
      followupDate: { $gte: startOfTomorrow },
    };


    let permission = "view-only";

    if (user.role === "admin") {
      permission = "full-access";
    } else {
      query.assign = assign; 
    }

    const leads = await Lead.find(query).sort({ followupDate: 1 }); 

    if (!leads || leads.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No valid follow-ups found",
        data: [],
      });
    }

    res.status(200).json({
      status: "success",
      message: "Data retrieved successfully",
      permission,
      totalLength: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error("Error fetching follow-ups:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getInprogressLead = async (req, res) => {
  try {
    const { assign } = req.query;

    if (!assign) {
      return res.status(400).json({
        status: "error",
        message: "Assign field is required",
      });
    }

    // Fetch user details
    const user = await User.findOne({ name: assign });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Invalid username or no data found",
      });
    }

    let query = { status: "In Progress" };
    let permission = "view-only";

    if (user.role === "user") {
      query.assign = assign;
    } else if (user.role === "admin") {
      permission = "full-access";
    } else {
      return res.status(403).json({
        status: "error",
        message: "Access denied for this role",
      });
    }

    // Fetch leads based on role
    const leads = await Lead.find(query).sort({ updated_by: 1 });

    if (!leads || leads.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No results found",
        data: [],
      });
    }

    res.status(200).json({
      status: "success",
      message: "Data retrieved successfully",
      role: user.role,
      totalLength: leads.length,
      permission,
      data: leads,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getConvertedLead = async (req, res) => {
  try {
    const { assign } = req.query;

    if (!assign) {
      return res.status(400).json({
        status: "error",
        message: "Assign field is required",
      });
    }

    // Fetch user details
    const user = await User.findOne({ name: assign });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Invalid username or no data found",
      });
    }

    let query = { status: "converted" };
    let permission = "view-only";

    if (user.role === "user") {
      query.assign = assign;
    } else if (user.role === "admin") {
      permission = "full-access";
    } else {
      return res.status(403).json({
        status: "error",
        message: "Access denied for this role",
      });
    }

    // Fetch leads based on role
    const leads = await Lead.find(query).sort({ updated_by: 1 });

    if (!leads || leads.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No results found",
        data: [],
      });
    }

    res.status(200).json({
      status: "success",
      message: "Data retrieved successfully",
      role: user.role,
      totalLength: leads.length,
      permission,
      data: leads,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getDeadLead = async (req, res) => {
  try {
    const { assign } = req.query;

    if (!assign) {
      return res.status(400).json({
        status: "error",
        message: "Assign field is required",
      });
    }

    // Fetch user details
    const user = await User.findOne({ name: assign });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Invalid username or no data found",
      });
    }

    let query = { status: "dead" };
    let permission = "view-only";

    if (user.role === "user") {
      query.assign = assign;
    } else if (user.role === "admin") {
      permission = "full-access";
    } else {
      return res.status(403).json({
        status: "error",
        message: "Access denied for this role",
      });
    }

    // Fetch leads based on role
    const leads = await Lead.find(query).sort({ updated_by: 1 });

    if (!leads || leads.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No results found",
        data: [],
      });
    }

    res.status(200).json({
      status: "success",
      message: "Data retrieved successfully",
      role: user.role,
      totalLength: leads.length,
      permission,
      data: leads,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const getStatusCounts = async (req, res) => {
  try {
    const { assign, role } = req.query; 

    let startOfTomorrow = new Date();
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    startOfTomorrow.setHours(0, 0, 0, 0);

    let endOfTomorrow = new Date(startOfTomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    if (!role) {
      return res.status(400).json({
        status: "error",
        message: "Missing role parameter",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filter = {}; 

    if (role !== "admin" && assign) {
      // If not admin, filter by assigned leads
      filter.assign = assign;
    }

    // Fetch counts based on role
    const overdueFollowUps = await Lead.countDocuments({
      status: "followup",
      followupDate: { $exists: true, $ne: null, $lt: today },
      ...filter,
    });

    const todayFollowUps = await Lead.countDocuments({
      status: "followup",
      followupDate: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
      ...filter,
    });

    const inProgressLeads = await Lead.countDocuments({
      status: "In Progress",
      ...filter,
    });

    const convertedLeads = await Lead.countDocuments({
      status: "converted",
      ...filter,
    });

    const deadLeads = await Lead.countDocuments({
      status: "dead",
      ...filter,
    });

    const followups = await Lead.countDocuments({
      status: "followup",
      followupDate: { $gte: startOfTomorrow },
      ...filter,
    });

    res.status(200).json({
      status: "success",
      message: "Lead counts retrieved successfully",
      data: {
        overdueFollowUps,
        todayFollowUps,
        inProgressLeads,
        convertedLeads,
        deadLeads,
        followups,
      },
    });
  } catch (error) {
    console.error("Error fetching lead counts:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};





