import{t as e}from"./DatabaseService-BmM91XB-.js";var t=new class{get db(){return e.getAdapter()}async getSalesReport(e,t){let n=(await this.db.query(`SELECT 
        SUM(grandTotal) as gross,
        SUM(tax) as totalTax,
        COUNT(id) as count,
        SUM(CASE WHEN paymentMethod = 'cash' THEN amountPaid ELSE 0 END) as cash,
        SUM(CASE WHEN paymentMethod = 'card' THEN amountPaid ELSE 0 END) as card,
        SUM(CASE WHEN paymentMethod = 'upi' THEN amountPaid ELSE 0 END) as upi
       FROM bills
       WHERE createdAt >= ? AND createdAt <= ?`,[e,t]))[0]||{};return{grossSales:n.gross||0,taxCollected:n.totalTax||0,billsCount:n.count||0,cashSales:n.cash||0,cardSales:n.card||0,upiSales:n.upi||0}}async getInventoryValue(){return(await this.db.query(`SELECT SUM(stockQty * costPrice) as totalVal FROM ingredients`))[0]?.totalVal||0}async getPandLReport(e,t){let n=await this.getSalesReport(e,t),r=(await this.db.query(`SELECT SUM(amount) as total FROM expenses WHERE timestamp >= ? AND timestamp <= ?`,[e,t]))[0]?.total||0,i=(await this.db.query(`SELECT SUM(total) as total FROM goods_receipts WHERE receivedDate >= ? AND receivedDate <= ?`,[e,t]))[0]?.total||0;return{totalRevenue:n.grossSales,totalCostOfGoodsSold:i,totalExpenses:r,netProfit:n.grossSales-i-r}}};export{t};