import { Client, isFullPage } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { notion } from "./client";
import dotenv from "dotenv";
import { format, getDate } from "date-fns";

dotenv.config()

const FLOW_DB_ID = process.env.FLOW_DB_ID as string
const ASSETS_DB_ID = process.env.ASSETS_DB_ID as string
const TEMPLATE_DB_ID = process.env.TEMPLATE_DB_ID as string


async function assetsTotal() {

  // assets database
  const assetRes = await notion.databases.query({
    database_id: ASSETS_DB_ID,
  });
  const fullPages = assetRes.results.filter(isFullPage)
  const assestsTotal = fullPages.reduce((pre, curr) => {
    const p = curr.properties
    const currency = p["金額"]
    if (currency.type === 'number') {
      return pre + (currency.number || 0)
    }
    return pre + 0
  }, 0)
  
  console.log({assestsTotal})
  return assestsTotal
}

async function flowSortByNameCurrency() {
  // flow database
  const response = await notion.databases.query({
    database_id: FLOW_DB_ID,
    sorts: [{
      property: '日付',
      direction: 'ascending',
    }, {
      property: 'Name',
      direction: 'ascending',
    }]
  })

  const records = response.results.filter(isFullPage)
  return records
}

async function assetsSubTotal() {

  const assTotal = await assetsTotal()
  console.log({assTotal})
  
  const flows = await flowSortByNameCurrency()
  
  // 累計計算
  flows.reduce((pre, curr) => {
    
    const currency = curr.properties['金額']
    if (currency.type !== 'number') {
      return pre
    }
    
    const subTotal = curr.properties['累計金額']
    if (subTotal.type !== 'number') {
      return pre
    } 

    const total = (currency.number || 0) + pre
    
    subTotal.number = total
    return total
  }, assTotal)
  
  // 更新処理
  await Promise.all(flows.map(async (e) => {

    console.log({properties: e.properties})
    const res = await notion.pages.update({
      page_id: e.id,
      properties: {'累計金額': {...e.properties['累計金額']}},
    })
    return res
  }))
}

/**
 * テンプレート追加
 */
async function templateAdd() {

  const flow = await flowSortByNameCurrency()
  const [tail,] = flow.reverse()
  let tailDate = tail.properties["日付"]

  let lastDate = new Date()
  if (tailDate.type === 'date' && tailDate.date) {
    lastDate = new Date(tailDate.date.start)
  }
  lastDate.setMonth(lastDate.getMonth() + 1)
  
  const templates = await notion.databases.query({
    database_id: TEMPLATE_DB_ID,
    sorts: [{
      property: "順番",
      direction: 'ascending',
    }]
  })

  const templatePages = templates.results.filter(isFullPage)

  try {
    await Promise.all(templatePages.map(async(e) => {

      const name = e.properties["Name"]
      const currency = e.properties["金額"]
      const date = e.properties["日付"]
      const nextMonth = e.properties["次月"]
      if (name.type !== "title") {
        console.log({name})
        return
      }
      if (currency.type !== "number") {
        console.log({currency})
        return
      }
      if (date.type !== "rich_text") {
        console.log({date})
        return
      }
      if (nextMonth.type !== "checkbox") {
        console.log({nextMonth})
        return
      }

      let month = lastDate.getMonth() - 1
      nextMonth.checkbox && month++
        
      const insertDate = new Date(lastDate.getFullYear(), month,
        Number(date.rich_text[0].plain_text), 0, 0, 0)
      await notion.pages.create({
        parent: {
          database_id: FLOW_DB_ID
        },
        properties: {
          "Name": {
            title: [{
              text: {
                content: name.title[0].plain_text
              }
            }]
          },
          "金額": {
            number: currency.number
          },
          "日付": {
            date: {
              start: format(insertDate, 'yyyy-MM-dd HH:mm:ss'),
              time_zone: "Asia/Tokyo"
            }
          }
        }
      })
    }))
  } catch (e) {
    console.log(e)
    throw e
  }
}

async function main() {

  console.log('templateAdd ======')
  await templateAdd()

  // console.log('assetsSubTotal ======')
  // await assetsSubTotal()

  console.log('end ======')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
