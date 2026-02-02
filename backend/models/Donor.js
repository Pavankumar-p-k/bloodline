const mongoose = require("mongoose");

const donorSchema = new mongoose.Schema({
  name: String,
  bloodGroup: String,
  phone: String,
  city: String,
  lastDonationDate: Date,
}, { timestamps: true });

module.exports = mongoose.model("Donor", donorSchema);
