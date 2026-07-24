require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const {
  sequelize, Company, Branch, Warehouse, User, Account,
  Category, Unit, Product, Stock,
  Supplier, Route, Customer,
  GoodsReceived, GoodsReceivedLine,
  Invoice, InvoiceLine, Receipt, ReceiptAllocation, Expense,
} = require('../models');

async function seedDemo() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    const company = await Company.findOne({ where: { name: 'Lanka Distribution (Pvt) Ltd' } });
    if (!company) { console.error('Run seed.js first!'); process.exit(1); }

    const branch   = await Branch.findOne({ where: { code: 'HO' } });
    const warehouse = await Warehouse.findOne({ where: { code: 'WH-COL' } });
    const admin    = await User.findOne({ where: { email: 'admin@lankadist.lk' } });
    const pcsUnit  = await Unit.findOne({ where: { company_id: company.id, name: 'Piece' } });

    // Pre-load accounts we'll reference
    const acctMap = {};
    for (const code of ['1201','2101','6101','6201','6301','6302','6401','6501','6601']) {
      const a = await Account.findOne({ where: { company_id: company.id, code } });
      if (a) acctMap[code] = a;
    }
    console.log('Foundation data loaded.');

    // ─── CATEGORIES ─────────────────────────────────────────────────────────────
    const CAT_DATA = [
      { code: 'BEV', name: 'Beverages' },
      { code: 'DAI', name: 'Dairy & Chilled' },
      { code: 'SNK', name: 'Snacks & Confectionery' },
      { code: 'HHS', name: 'Household & Cleaning' },
      { code: 'PRC', name: 'Personal Care' },
      { code: 'FGR', name: 'Food & Grains' },
      { code: 'INS', name: 'Instant Foods' },
    ];
    const cats = {};
    for (const c of CAT_DATA) {
      const [cat] = await Category.findOrCreate({ where: { company_id: company.id, code: c.code }, defaults: { ...c, company_id: company.id } });
      cats[c.code] = cat;
    }
    console.log('Categories: 7');

    // ─── PRODUCTS ────────────────────────────────────────────────────────────────
    // cost / sell / ws / vat% / reorder
    const PROD_DATA = [
      { sku:'BEV-001', name:'Coca-Cola 250ml Can',          cat:'BEV', cost:45,   sell:65,   ws:58,   vat:0,  reorder:100 },
      { sku:'BEV-002', name:'Pepsi 250ml Can',              cat:'BEV', cost:42,   sell:62,   ws:55,   vat:0,  reorder:100 },
      { sku:'BEV-003', name:'Highland Water 1L',            cat:'BEV', cost:25,   sell:40,   ws:35,   vat:0,  reorder:150 },
      { sku:'BEV-004', name:'Elephant House OJ 750ml',      cat:'BEV', cost:280,  sell:395,  ws:360,  vat:0,  reorder:30  },
      { sku:'DAI-001', name:'Anchor Milk Powder 400g',      cat:'DAI', cost:680,  sell:850,  ws:790,  vat:0,  reorder:50  },
      { sku:'DAI-002', name:'Milco UHT Milk 1L',            cat:'DAI', cost:195,  sell:250,  ws:225,  vat:0,  reorder:80  },
      { sku:'DAI-003', name:'Fresh Curd 80g',               cat:'DAI', cost:45,   sell:70,   ws:62,   vat:0,  reorder:100 },
      { sku:'SNK-001', name:'Munchee Cream Crackers 200g',  cat:'SNK', cost:120,  sell:165,  ws:148,  vat:18, reorder:50  },
      { sku:'SNK-002', name:'Tiger Biscuits 200g',          cat:'SNK', cost:95,   sell:135,  ws:120,  vat:18, reorder:60  },
      { sku:'SNK-003', name:'Maliban Nice 200g',            cat:'SNK', cost:85,   sell:120,  ws:108,  vat:18, reorder:60  },
      { sku:'HHS-001', name:'Dettol Soap 100g',             cat:'HHS', cost:130,  sell:175,  ws:158,  vat:0,  reorder:40  },
      { sku:'HHS-002', name:'Vim Powder 500g',              cat:'HHS', cost:155,  sell:210,  ws:190,  vat:0,  reorder:40  },
      { sku:'PRC-001', name:'Sunlight Dishwash 400ml',      cat:'PRC', cost:185,  sell:250,  ws:225,  vat:0,  reorder:40  },
      { sku:'PRC-002', name:'Palmolive Shampoo 200ml',      cat:'PRC', cost:360,  sell:480,  ws:430,  vat:0,  reorder:30  },
      { sku:'FGR-001', name:'Basmati Rice 5kg',             cat:'FGR', cost:1850, sell:2400, ws:2200, vat:0,  reorder:20  },
      { sku:'FGR-002', name:'Red Dhal 1kg',                 cat:'FGR', cost:280,  sell:380,  ws:350,  vat:0,  reorder:30  },
      { sku:'INS-001', name:'Maggi Noodles 80g',            cat:'INS', cost:55,   sell:85,   ws:75,   vat:18, reorder:80  },
    ];
    const prods = {};
    for (const p of PROD_DATA) {
      const [prod] = await Product.findOrCreate({
        where: { company_id: company.id, sku: p.sku },
        defaults: {
          company_id: company.id,
          category_id: cats[p.cat].id,
          base_unit_id: pcsUnit?.id,
          sku: p.sku, name: p.name,
          cost_price: p.cost, selling_price: p.sell, wholesale_price: p.ws,
          vat_rate: p.vat, reorder_point: p.reorder, is_active: true,
        },
      });
      prods[p.sku] = prod;
    }
    console.log('Products: 17');

    // ─── SUPPLIERS ───────────────────────────────────────────────────────────────
    const SUPP_DATA = [
      { code:'SUP-001', name:'Coca-Cola Beverages Lanka Ltd',  contact:'Pradeep Silva',        phone:'+94 11 456 7890', credit_days:30 },
      { code:'SUP-002', name:'Anchor Foods Lanka (Pvt) Ltd',  contact:'Nalini Perera',         phone:'+94 11 345 6789', credit_days:30 },
      { code:'SUP-003', name:'Ceylon Biscuits Ltd (CBL)',      contact:'Ruwan Fernando',        phone:'+94 11 567 8901', credit_days:45 },
      { code:'SUP-004', name:'Reckitt Lanka (Pvt) Ltd',        contact:'Saman Jayawardena',     phone:'+94 11 678 9012', credit_days:30 },
      { code:'SUP-005', name:'Prima Ceylon (Pvt) Ltd',         contact:'Chaminda Wickramasinghe', phone:'+94 11 789 0123', credit_days:30 },
    ];
    const supps = {};
    for (const s of SUPP_DATA) {
      const [supp] = await Supplier.findOrCreate({
        where: { company_id: company.id, code: s.code },
        defaults: { ...s, company_id: company.id, account_id: acctMap['2101']?.id, is_active: true },
      });
      supps[s.code] = supp;
    }
    console.log('Suppliers: 5');

    // ─── ROUTES ──────────────────────────────────────────────────────────────────
    const ROUTE_DATA = [
      { code:'COL-N', name:'Colombo North', area:'Colombo 1-7, Kelaniya, Wattala' },
      { code:'COL-S', name:'Colombo South', area:'Colombo 6-10, Dehiwala, Maharagama' },
      { code:'KANDY', name:'Kandy',         area:'Kandy, Peradeniya, Kundasale, Gampola' },
      { code:'GALLE', name:'Galle',         area:'Galle, Hikkaduwa, Unawatuna, Matara' },
    ];
    const routes = {};
    for (const r of ROUTE_DATA) {
      const [route] = await Route.findOrCreate({
        where: { branch_id: branch.id, code: r.code },
        defaults: { ...r, branch_id: branch.id, is_active: true },
      });
      routes[r.code] = route;
    }
    console.log('Routes: 4');

    // ─── CUSTOMERS ───────────────────────────────────────────────────────────────
    const CUST_DATA = [
      { code:'CUS-001', name:'Nandana Stores',              type:'RETAILER',   route:'COL-N', credit_days:30, credit_limit:50000,  phone:'+94 77 111 2222', address:'Main Street, Pettah, Colombo 11' },
      { code:'CUS-002', name:'Karunarathne Groceries',      type:'RETAILER',   route:'COL-N', credit_days:30, credit_limit:40000,  phone:'+94 77 222 3333', address:'Manning Market, Colombo 10' },
      { code:'CUS-003', name:'Keells Super - Ja-Ela',       type:'DIRECT',     route:'COL-N', credit_days:45, credit_limit:500000, phone:'+94 11 234 5678', address:'Negombo Road, Ja-Ela' },
      { code:'CUS-004', name:'City Wholesale Centre',       type:'WHOLESALER', route:'COL-S', credit_days:45, credit_limit:300000, phone:'+94 77 333 4444', address:'Sea Street, Pettah, Colombo 11' },
      { code:'CUS-005', name:'Sampath Stores',              type:'RETAILER',   route:'COL-S', credit_days:30, credit_limit:35000,  phone:'+94 77 444 5555', address:'Dehiwala Road, Dehiwala' },
      { code:'CUS-006', name:'Nalini Grocery & Fashion',    type:'RETAILER',   route:'COL-S', credit_days:30, credit_limit:25000,  phone:'+94 77 555 6666', address:'High Level Road, Maharagama' },
      { code:'CUS-007', name:'LAUGFS Supermarket Kandy',    type:'DIRECT',     route:'KANDY', credit_days:45, credit_limit:400000, phone:'+94 81 222 3333', address:'Peradeniya Road, Kandy' },
      { code:'CUS-008', name:'Perera Brothers Wholesale',   type:'WHOLESALER', route:'KANDY', credit_days:45, credit_limit:250000, phone:'+94 81 333 4444', address:'Dalada Veediya, Kandy' },
      { code:'CUS-009', name:'Hemantha General Store',      type:'RETAILER',   route:'GALLE', credit_days:30, credit_limit:75000,  phone:'+94 91 222 3333', address:'Wakwella Road, Galle' },
      { code:'CUS-010', name:'Southern Wholesale Depot',    type:'WHOLESALER', route:'GALLE', credit_days:30, credit_limit:200000, phone:'+94 91 333 4444', address:'Galle Fort Road, Galle' },
    ];
    const custs = {};
    for (const c of CUST_DATA) {
      const [cust] = await Customer.findOrCreate({
        where: { company_id: company.id, code: c.code },
        defaults: {
          company_id: company.id, branch_id: branch.id,
          route_id: routes[c.route].id,
          name: c.name, code: c.code, customer_type: c.type,
          phone: c.phone, address: c.address,
          credit_days: c.credit_days, credit_limit: c.credit_limit,
          is_active: true, account_id: acctMap['1201']?.id,
        },
      });
      custs[c.code] = cust;
    }
    console.log('Customers: 10');

    // ─── GOODS RECEIVED (POSTED) ──────────────────────────────────────────────────
    const GRN_DATA = [
      {
        num:'GRN-20260115-001', date:'2026-01-15', supplier:'SUP-001',
        lines:[
          { sku:'BEV-001', qty:600, cost:45 },
          { sku:'BEV-002', qty:360, cost:42 },
          { sku:'BEV-003', qty:500, cost:25 },
          { sku:'BEV-004', qty:120, cost:280 },
        ],
      },
      {
        num:'GRN-20260115-002', date:'2026-01-15', supplier:'SUP-002',
        lines:[
          { sku:'DAI-001', qty:250, cost:680 },
          { sku:'DAI-002', qty:350, cost:195 },
          { sku:'DAI-003', qty:500, cost:45 },
        ],
      },
      {
        num:'GRN-20260215-001', date:'2026-02-15', supplier:'SUP-003',
        lines:[
          { sku:'SNK-001', qty:300, cost:120 },
          { sku:'SNK-002', qty:300, cost:95 },
          { sku:'SNK-003', qty:300, cost:85 },
        ],
      },
      {
        num:'GRN-20260215-002', date:'2026-02-15', supplier:'SUP-004',
        lines:[
          { sku:'HHS-001', qty:200, cost:130 },
          { sku:'HHS-002', qty:100, cost:155 },
          { sku:'PRC-001', qty:150, cost:185 },
          { sku:'PRC-002', qty:60,  cost:360 },
        ],
      },
      {
        num:'GRN-20260215-003', date:'2026-02-15', supplier:'SUP-005',
        lines:[
          { sku:'FGR-001', qty:80,  cost:1850 },
          { sku:'FGR-002', qty:150, cost:280 },
          { sku:'INS-001', qty:100, cost:55 },
        ],
      },
    ];
    for (const g of GRN_DATA) {
      if (await GoodsReceived.findOne({ where: { grn_number: g.num } })) continue;
      const subtotal = g.lines.reduce((s, l) => s + l.qty * l.cost, 0);
      const grn = await GoodsReceived.create({
        company_id: company.id, branch_id: branch.id, warehouse_id: warehouse.id,
        supplier_id: supps[g.supplier].id,
        grn_number: g.num, grn_date: g.date, status: 'POSTED',
        subtotal, vat_amount: 0, total_amount: subtotal,
        posted_by: admin.id, posted_at: new Date(g.date), created_by: admin.id,
      });
      for (const l of g.lines) {
        await GoodsReceivedLine.create({
          grn_id: grn.id, product_id: prods[l.sku].id,
          quantity: l.qty, unit_cost: l.cost, vat_rate: 0,
          line_total: l.qty * l.cost,
        });
      }
    }
    console.log('GRNs: 5 (POSTED)');

    // ─── STOCK ───────────────────────────────────────────────────────────────────
    // 4 products intentionally below reorder point for Low Stock report
    const STOCK_DATA = [
      { sku:'BEV-001', qty:450 }, { sku:'BEV-002', qty:350 },
      { sku:'BEV-003', qty:420 }, { sku:'BEV-004', qty:5   }, // LOW (reorder:30)
      { sku:'DAI-001', qty:220 }, { sku:'DAI-002', qty:260 },
      { sku:'DAI-003', qty:470 },
      { sku:'SNK-001', qty:270 }, { sku:'SNK-002', qty:240 },
      { sku:'SNK-003', qty:270 },
      { sku:'HHS-001', qty:185 }, { sku:'HHS-002', qty:85  },
      { sku:'PRC-001', qty:128 }, { sku:'PRC-002', qty:8   }, // LOW (reorder:30)
      { sku:'FGR-001', qty:18  },                              // LOW (reorder:20)
      { sku:'FGR-002', qty:105 },
      { sku:'INS-001', qty:15  },                              // LOW (reorder:80)
    ];
    for (const s of STOCK_DATA) {
      await Stock.upsert({ warehouse_id: warehouse.id, product_id: prods[s.sku].id, quantity: s.qty, reserved_quantity: 0 });
    }
    console.log('Stock loaded (4 products below reorder point).');

    // ─── INVOICES ────────────────────────────────────────────────────────────────
    // Lines: { sku, qty, price, vat }
    // paid: partial amount paid (omit for full PAID or 0 for POSTED/OVERDUE)
    const INV_DATA = [
      { num:'INV-20260120-001', date:'2026-01-20', due:'2026-02-19', cust:'CUS-001', status:'PAID',
        lines:[{ sku:'BEV-001', qty:24, price:65,  vat:0  },
               { sku:'BEV-003', qty:12, price:40,  vat:0  },
               { sku:'SNK-001', qty:6,  price:165, vat:18 }] },

      { num:'INV-20260128-001', date:'2026-01-28', due:'2026-03-13', cust:'CUS-004', status:'PAID',
        lines:[{ sku:'BEV-001', qty:48, price:58,  vat:0 },
               { sku:'BEV-003', qty:24, price:35,  vat:0 },
               { sku:'DAI-001', qty:12, price:790, vat:0 }] },

      { num:'INV-20260210-001', date:'2026-02-10', due:'2026-03-27', cust:'CUS-007', status:'PARTIAL', paid:6000,
        lines:[{ sku:'BEV-001', qty:36, price:65,  vat:0 },
               { sku:'DAI-002', qty:24, price:250, vat:0 },
               { sku:'PRC-001', qty:12, price:250, vat:0 }] },

      { num:'INV-20260215-001', date:'2026-02-15', due:'2026-04-01', cust:'CUS-008', status:'PAID',
        lines:[{ sku:'FGR-001', qty:6,  price:2200, vat:0 },
               { sku:'FGR-002', qty:12, price:350,  vat:0 }] },

      { num:'INV-20260305-001', date:'2026-03-05', due:'2026-04-04', cust:'CUS-005', status:'OVERDUE',
        lines:[{ sku:'BEV-001', qty:12, price:65,  vat:0  },
               { sku:'BEV-002', qty:6,  price:62,  vat:0  },
               { sku:'DAI-001', qty:3,  price:850, vat:0  },
               { sku:'SNK-001', qty:6,  price:165, vat:18 }] },

      { num:'INV-20260320-001', date:'2026-03-20', due:'2026-04-19', cust:'CUS-010', status:'OVERDUE',
        lines:[{ sku:'BEV-003', qty:24, price:35,  vat:0 },
               { sku:'HHS-001', qty:12, price:158, vat:0 },
               { sku:'PRC-002', qty:6,  price:430, vat:0 }] },

      { num:'INV-20260410-001', date:'2026-04-10', due:'2026-05-25', cust:'CUS-007', status:'PARTIAL', paid:8000,
        lines:[{ sku:'DAI-002', qty:48, price:250, vat:0  },
               { sku:'DAI-003', qty:24, price:70,  vat:0  },
               { sku:'SNK-002', qty:12, price:135, vat:18 }] },

      { num:'INV-20260420-001', date:'2026-04-20', due:'2026-05-20', cust:'CUS-001', status:'OVERDUE',
        lines:[{ sku:'BEV-001', qty:24, price:65,  vat:0  },
               { sku:'SNK-001', qty:12, price:165, vat:18 },
               { sku:'HHS-002', qty:6,  price:210, vat:0  }] },

      { num:'INV-20260510-001', date:'2026-05-10', due:'2026-06-09', cust:'CUS-009', status:'PARTIAL', paid:15000,
        lines:[{ sku:'FGR-001', qty:12, price:2400, vat:0 },
               { sku:'FGR-002', qty:6,  price:380,  vat:0 }] },

      { num:'INV-20260520-001', date:'2026-05-20', due:'2026-06-19', cust:'CUS-004', status:'OVERDUE',
        lines:[{ sku:'INS-001', qty:48, price:75,  vat:18 },
               { sku:'SNK-002', qty:36, price:120, vat:18 },
               { sku:'SNK-003', qty:24, price:108, vat:18 }] },

      { num:'INV-20260615-001', date:'2026-06-15', due:'2026-07-15', cust:'CUS-002', status:'POSTED',
        lines:[{ sku:'DAI-001', qty:6,  price:850, vat:0 },
               { sku:'DAI-002', qty:12, price:250, vat:0 },
               { sku:'PRC-001', qty:6,  price:250, vat:0 }] },

      { num:'INV-20260710-001', date:'2026-07-10', due:'2026-08-24', cust:'CUS-008', status:'PARTIAL', paid:10000,
        lines:[{ sku:'FGR-001', qty:12, price:2200, vat:0 },
               { sku:'FGR-002', qty:24, price:350,  vat:0 },
               { sku:'HHS-002', qty:6,  price:190,  vat:0 }] },
    ];

    const savedInvoices = {};
    for (const inv of INV_DATA) {
      if (await Invoice.findOne({ where: { invoice_number: inv.num } })) continue;

      let subtotal = 0, vatTotal = 0;
      const lines = inv.lines.map(l => {
        const sub  = Math.round(l.qty * l.price * 100) / 100;
        const vat  = Math.round(sub * l.vat / 100 * 100) / 100;
        const tot  = sub + vat;
        subtotal  += sub;
        vatTotal  += vat;
        return { ...l, sub, vat, tot };
      });
      const totalAmount  = Math.round((subtotal + vatTotal) * 100) / 100;
      const paidAmount   = inv.paid !== undefined ? inv.paid : (inv.status === 'PAID' ? totalAmount : 0);
      const balanceDue   = Math.round((totalAmount - paidAmount) * 100) / 100;

      const invoice = await Invoice.create({
        company_id: company.id, branch_id: branch.id, warehouse_id: warehouse.id,
        customer_id: custs[inv.cust].id, sales_rep_id: admin.id,
        invoice_number: inv.num, invoice_date: inv.date, due_date: inv.due,
        invoice_type: 'TAX_INVOICE', status: inv.status,
        subtotal: subtotal.toFixed(2),
        discount_amount: '0.00',
        vat_amount: vatTotal.toFixed(2),
        total_amount: totalAmount.toFixed(2),
        paid_amount: paidAmount.toFixed(2),
        balance_due: balanceDue.toFixed(2),
        posted_by: admin.id, posted_at: new Date(inv.date), created_by: admin.id,
      });
      for (const l of lines) {
        await InvoiceLine.create({
          invoice_id: invoice.id, product_id: prods[l.sku].id,
          quantity: l.qty, unit_price: l.price,
          discount_rate: '0.00', vat_rate: l.vat,
          line_subtotal: l.sub.toFixed(2),
          vat_amount: l.vat.toFixed(2),
          line_total: l.tot.toFixed(2),
          cost_price: prods[l.sku].cost_price,
        });
      }
      savedInvoices[inv.num] = invoice;
    }
    console.log('Invoices: 12 (PAID:2, PARTIAL:3, OVERDUE:5, POSTED:2)');

    // ─── RECEIPTS ────────────────────────────────────────────────────────────────
    const RCP_DATA = [
      { num:'RCP-20260125-001', date:'2026-01-25', cust:'CUS-001', inv:'INV-20260120-001', amount:3208.20, method:'CASH' },
      { num:'RCP-20260205-001', date:'2026-02-05', cust:'CUS-004', inv:'INV-20260128-001', amount:13104,   method:'BANK_TRANSFER' },
      { num:'RCP-20260225-001', date:'2026-02-25', cust:'CUS-007', inv:'INV-20260210-001', amount:6000,    method:'CASH' },
      { num:'RCP-20260222-001', date:'2026-02-22', cust:'CUS-008', inv:'INV-20260215-001', amount:17400,   method:'BANK_TRANSFER' },
      { num:'RCP-20260415-001', date:'2026-04-15', cust:'CUS-007', inv:'INV-20260410-001', amount:8000,    method:'CASH' },
      { num:'RCP-20260520-001', date:'2026-05-20', cust:'CUS-009', inv:'INV-20260510-001', amount:15000,   method:'BANK_TRANSFER' },
      { num:'RCP-20260715-001', date:'2026-07-15', cust:'CUS-008', inv:'INV-20260710-001', amount:10000,   method:'CASH' },
    ];
    for (const r of RCP_DATA) {
      if (await Receipt.findOne({ where: { receipt_number: r.num } })) continue;
      const rcpt = await Receipt.create({
        company_id: company.id, branch_id: branch.id, customer_id: custs[r.cust].id,
        receipt_number: r.num, receipt_date: r.date,
        payment_method: r.method, amount: r.amount,
        status: 'POSTED', created_by: admin.id, collected_by: admin.id,
      });
      // Look up the invoice — may be from prior run (findOne) or current run (savedInvoices)
      const inv = savedInvoices[r.inv] || await Invoice.findOne({ where: { invoice_number: r.inv } });
      if (inv) {
        await ReceiptAllocation.create({ receipt_id: rcpt.id, invoice_id: inv.id, allocated_amount: r.amount });
      }
    }
    console.log('Receipts: 7');

    // ─── UPDATE CUSTOMER OUTSTANDING BALANCES ────────────────────────────────────
    const OUTSTANDING = {
      'CUS-001': 5156.40,  // INV-8 overdue
      'CUS-002': 9600.00,  // INV-11 posted
      'CUS-004': 12404.16, // INV-10 overdue
      'CUS-005': 4870.20,  // INV-5 overdue
      'CUS-007': 12931.60, // INV-3 + INV-7 partial
      'CUS-008': 25940.00, // INV-12 partial
      'CUS-009': 16080.00, // INV-9 partial
      'CUS-010': 5316.00,  // INV-6 overdue
    };
    for (const [code, bal] of Object.entries(OUTSTANDING)) {
      await custs[code].update({ outstanding_balance: bal });
    }
    console.log('Customer outstanding balances updated.');

    // ─── EXPENSES ────────────────────────────────────────────────────────────────
    const EXP_DATA = [
      { num:'EXP-20260131-001', date:'2026-01-31', acct:'6301', desc:'Warehouse rent — January 2026',              amount:150000, method:'BANK_TRANSFER' },
      { num:'EXP-20260131-002', date:'2026-01-31', acct:'6302', desc:'Electricity & water — January 2026',         amount:35000,  method:'CASH' },
      { num:'EXP-20260228-001', date:'2026-02-28', acct:'6101', desc:'Staff salaries — February 2026',             amount:450000, method:'BANK_TRANSFER' },
      { num:'EXP-20260228-002', date:'2026-02-28', acct:'6301', desc:'Warehouse rent — February 2026',             amount:150000, method:'BANK_TRANSFER' },
      { num:'EXP-20260331-001', date:'2026-03-31', acct:'6201', desc:'Transport & fuel — March 2026',              amount:28500,  method:'CASH' },
      { num:'EXP-20260331-002', date:'2026-03-31', acct:'6301', desc:'Warehouse rent — March 2026',                amount:150000, method:'BANK_TRANSFER' },
      { num:'EXP-20260430-001', date:'2026-04-30', acct:'6501', desc:'Marketing & advertising — April 2026',       amount:22000,  method:'CASH' },
      { num:'EXP-20260430-002', date:'2026-04-30', acct:'6101', desc:'Staff salaries — April 2026',                amount:450000, method:'BANK_TRANSFER' },
      { num:'EXP-20260531-001', date:'2026-05-31', acct:'6401', desc:'Office supplies & stationery — May 2026',    amount:8500,   method:'CASH' },
      { num:'EXP-20260531-002', date:'2026-05-31', acct:'6201', desc:'Vehicle fuel & maintenance — May 2026',      amount:32000,  method:'CASH' },
      { num:'EXP-20260630-001', date:'2026-06-30', acct:'6601', desc:'Bank charges & fees — June 2026',            amount:2500,   method:'BANK_TRANSFER' },
      { num:'EXP-20260630-002', date:'2026-06-30', acct:'6101', desc:'Staff salaries — June 2026',                 amount:450000, method:'BANK_TRANSFER' },
    ];
    for (const e of EXP_DATA) {
      if (await Expense.findOne({ where: { expense_number: e.num } })) continue;
      await Expense.create({
        company_id: company.id, branch_id: branch.id,
        account_id: acctMap[e.acct]?.id,
        expense_number: e.num, expense_date: e.date,
        description: e.desc, amount: e.amount,
        payment_method: e.method,
        status: 'POSTED', approved_by: admin.id, created_by: admin.id,
      });
    }
    console.log('Expenses: 12');

    console.log('\n✅ Demo data seeded!');
    console.log('');
    console.log('   Products below reorder point (Low Stock alert):');
    console.log('     BEV-004 Elephant House OJ  →  5 pcs  (reorder: 30)');
    console.log('     PRC-002 Palmolive Shampoo   →  8 pcs  (reorder: 30)');
    console.log('     FGR-001 Basmati Rice 5kg    →  18 pcs (reorder: 20)');
    console.log('     INS-001 Maggi Noodles 80g   →  15 pcs (reorder: 80)');
    console.log('');
    console.log('   Outstanding customer balances (Aged Debtors):');
    console.log('     CUS-001 Nandana Stores         LKR   5,156.40  (OVERDUE)');
    console.log('     CUS-002 Karunarathne            LKR   9,600.00  (POSTED)');
    console.log('     CUS-004 City Wholesale          LKR  12,404.16  (OVERDUE)');
    console.log('     CUS-005 Sampath Stores          LKR   4,870.20  (OVERDUE)');
    console.log('     CUS-007 LAUGFS Supermarket       LKR  12,931.60  (PARTIAL)');
    console.log('     CUS-008 Perera Brothers         LKR  25,940.00  (PARTIAL)');
    console.log('     CUS-009 Hemantha Stores         LKR  16,080.00  (PARTIAL)');
    console.log('     CUS-010 Southern Wholesale      LKR   5,316.00  (OVERDUE)');
    process.exit(0);
  } catch (err) {
    console.error('Demo seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

seedDemo();
