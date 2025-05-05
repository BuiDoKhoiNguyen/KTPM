const Data = require("../models/data")
const { cacheUtils, pubSubUtils } = require("../config/redis")
const retry = require("../utils/retry")

const CACHE_TTL = parseInt(process.env.REDIS_TTL || 600)

async function writeData(key, value, category = "default") {
  try {
    const dataObject = {
      value: value,
      category: category || "default",
      updatedAt: new Date().toISOString(),
      source: "database"
    }
    
    // Lưu vào database
    await Data.upsert({
      key: key,
      value: value,
      category: category || "default", 
      updatedAt: new Date(),
    });
    
    await cacheUtils.setCache(`data:${key}`, JSON.stringify(dataObject), CACHE_TTL)

    const message = {
      key,
      value,
      category: category || "default",
      timestamp: Date.now(),
    }

    const channelName = `data-updates:${category || "default"}`

    pubSubUtils.publish(channelName, message)
    return true
  } catch (error) {
    console.error("Database error:", error.message)
    throw error
  }
}

async function readData(key) {
  try {
    const cachedData = await cacheUtils.getCache(`data:${key}`)

    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData)
        return {
          ...parsedData,
          source: "cache" 
        }
      } catch (err) {
        console.warn(`Cannot parse cached data for key ${key}: ${err.message}`)
      }
    }

    const data = await retry(
      async () => {
        return await Data.findByPk(key, { raw: true })
      },
      {
        retries: 3, 
        delay: 100,
      }
    )

    if (!data) {
      return null
    }

    const dataObject = {
      value: data.value,
      updatedAt: data.updatedAt,
      category: data.category || "default",
      source: "database",
    }

    await cacheUtils.setCache(`data:${key}`, JSON.stringify(dataObject), CACHE_TTL)

    return dataObject
  } catch (error) {
    console.error("Data read error:", error.message)
    throw error
  }
}

async function getAllKeys() {
  try {
    const allData = await Data.findAll({
      attributes: ["key"],
      order: [["updatedAt", "DESC"]],
      raw: true,
    })

    const keys = allData.map((item) => item.key)
    return keys
  } catch (error) {
    console.error("Error getting all keys:", error)
    return []
  }
}

module.exports = {
  writeData,
  readData,
  getAllKeys,
}
