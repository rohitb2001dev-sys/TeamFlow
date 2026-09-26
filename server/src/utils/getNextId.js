const Counter = require("../models/Counter");

const getNextId = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { name },
    {
      $inc: {
        sequence: 1,
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  return counter.sequence;
};

module.exports = getNextId;