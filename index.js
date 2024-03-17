const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");

const html_to_pdf = async ({ templateHtml, dataBinding, options }) => {
  const template = handlebars.compile(templateHtml);
  const finalHtml = encodeURIComponent(template(dataBinding));

  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto(`data:text/html;charset=UTF-8,${finalHtml}`, {
    waitUntil: "networkidle0",
  });

  let pdfBuffer = await page.pdf(options); // based on = pdf(options?: PDFOptions): Promise<Buffer>; from https://pptr.dev/api/puppeteer.page.pdf pdfBuffer will stored the PDF file Buffer content when "path is not provoded" 
  await browser.close();
  return pdfBuffer; // Returning the value when page.pdf promise gets resolved
};

try {
  (async () => {
    const dataBinding = {
      to_company: {
        name: 'Bombay Crimpers Pvt Ltd',
        address: 'Kalyan , Bhiwandi road , Saroli Bhiwandi , Thane',
        gst_no: '27AAACB7204N1ZM',
      },
      place_of_supply: 'M.H.',
      invoice_no: '051/23-24',
      receipt_date: '03.01.2024',
      po_no: '359',
      po_no_date: '02/01/24',
      challan_no: '0108',
      challan_no_date: '02/01/24',
      items: [
        {
          sr_no: 1,
          description_of_service: '1st Back Gear Pinion Shaft',
          hsn_code: '8431',
          size: '',
          weight_in_kg_or_nos: '',
          qty_nos_or_kg: 2,
          rate_in_rs_p_p: 5930,
          amount: 11860
        },
        {
          sr_no: 2,
          description_of_service: 'Wire Rope Hoist Repair Labour Charge',
          hsn_code: '9987',
          size: '',
          weight_in_kg_or_nos: '',
          qty_nos_or_kg: 1,
          rate_in_rs_p_p: 5000,
          amount: 5000
        }
      ],
      total: 16860,
      cgst: 1517,
      sgst: 1517,
      final_total: 19894,
      final_total_in_words: 'Ninteen thousand Eight hundered Ninty Four only',
      isWatermark: false,
    };

    const templateHtml = fs.readFileSync(
      path.join(process.cwd(), "invoice.html"),
      "utf8"
    );

    const options = {
      format: "A4",
      headerTemplate: "<p></p>",
      footerTemplate: "<p></p>",
      displayHeaderFooter: false,
      margin: {
        top: "40px",
        bottom: "100px",
      },
      printBackground: true,
      path: "invoice.pdf",
    };

    await html_to_pdf({ templateHtml, dataBinding, options });

    console.log("Done: invoice.pdf is created!");
  })();
} catch (err) {
  console.log("ERROR:", err);
}



