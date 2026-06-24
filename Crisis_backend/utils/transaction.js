const mongoose = require('mongoose');

/**
 * Resilient transaction helper.
 * If running on a standalone MongoDB instance (which does not support transactions),
 * it executes the callback sequentially without starting a transaction session.
 * Otherwise, it runs the callback fully protected inside a MongoDB session transaction.
 */
const runInTransaction = async (fn) => {
  const conn = mongoose.connection;
  const isReplicaSet = 
    conn?.client?.topology?.description?.type === 'ReplicaSetNoPrimary' ||
    conn?.client?.topology?.description?.type === 'ReplicaSetWithPrimary' ||
    conn?.client?.topology?.description?.servers?.size > 1 ||
    process.env.MONGO_URI?.includes('replicaSet') ||
    process.env.MONGO_URI?.includes('mongodb+srv');

  if (!isReplicaSet) {
    // Fallback: Run sequentially without session to prevent standalone MongoDB crashes
    return await fn(null);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  runInTransaction,
};
