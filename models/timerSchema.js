const mongoose = require('mongoose')
const timerSchema = new mongoose.Schema({
    hours: { type: Number, require: true },
    unix: { type: Number, require: true }
})

const model = mongoose.model('TimerSchema', timerSchema)
module.exports = model