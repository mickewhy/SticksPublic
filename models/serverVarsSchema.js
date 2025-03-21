const mongoose = require('mongoose')
const serverVarsSchema = new mongoose.Schema({
    name: { type: String, require: true },
    value: { type: Object, require: true }
})

const model = mongoose.model('ServerVarsSchema', serverVarsSchema)
module.exports = model