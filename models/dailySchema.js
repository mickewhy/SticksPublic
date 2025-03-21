const mongoose = require('mongoose')
const dailySchema = new mongoose.Schema({
    userID: { type: String, require: true, unique: true },
    unix: { type: Number, require: true }
})

const model = mongoose.model('DailySchema', dailySchema)
module.exports = model