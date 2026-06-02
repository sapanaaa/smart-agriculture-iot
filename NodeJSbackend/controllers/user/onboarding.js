import UserModel from "../../models/userModel.js";

/**
 * POST /api/userOnboarding
 * Updates the authenticated user's profile during onboarding.
 * Requires authToken middleware (sets req.user.id).
 *
 * Note: role and account status are NOT settable here — those are
 * controlled by admins via the admin panel. Onboarding only captures
 * profile details. `device_id` here is the user's own ESP-32 they wish
 * to register; admins can later adjust the full device list.
 */
async function userOnboarding(req, res) {
  try {
    const { firstName, lastName, device_id, district, region, phone } =
      req.body || {};

    const update = {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(district !== undefined && { district }),
      ...(region !== undefined && { region }),
      ...(phone !== undefined && { phone }),
    };

    // Keep the legacy single device_id and the devices array in sync.
    if (device_id !== undefined && device_id !== null && device_id !== "") {
      update.device_id = device_id;
      update.$addToSet = { devices: device_id };
    }

    const userDetails = await UserModel.findByIdAndUpdate(
      req.user.id,
      update,
      { new: true }
    ).lean();

    if (!userDetails) {
      return res
        .status(404)
        .json({ success: false, error: true, message: "User not found." });
    }

    delete userDetails.password;
    delete userDetails.verificationToken;
    delete userDetails.verificationTokenExpires;

    return res.json({
      success: true,
      error: false,
      message: "Profile updated successfully.",
      data: userDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || "Something went wrong updating your profile.",
    });
  }
}

export default userOnboarding;
