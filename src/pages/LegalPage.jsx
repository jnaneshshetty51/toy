import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import './LegalPage.css';

export default function LegalPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('terms');

  useEffect(() => {
    if (location.pathname.includes('privacy')) setActiveTab('privacy');
    else if (location.pathname.includes('shipping')) setActiveTab('shipping');
    else if (location.pathname.includes('returns')) setActiveTab('returns');
    else if (location.pathname.includes('bis')) setActiveTab('bis');
    else setActiveTab('terms');
  }, [location.pathname]);

  return (
    <div className="legal-page-root">
      <div className="container">
        {/* Header Banner */}
        <header className="legal-header">
          <div className="legal-badge">STATUTORY & REGULATORY COMPLIANCE</div>
          <h1 className="legal-title">Legal Policies & Indian Consumer Protection</h1>
          <p className="legal-subtitle">
            Operating under Consumer Protection (E-Commerce) Rules, 2020, Bureau of Indian Standards (BIS) IS-9873, and the Digital Personal Data Protection Act.
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="legal-tabs-nav">
          <button 
            className={`legal-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
            onClick={() => setActiveTab('terms')}
          >
            <FileText size={16} /> Terms of Service
          </button>
          <button 
            className={`legal-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <ShieldCheck size={16} /> Privacy Policy (DPDP)
          </button>
          <button 
            className={`legal-tab-btn ${activeTab === 'shipping' ? 'active' : ''}`}
            onClick={() => setActiveTab('shipping')}
          >
            <Truck size={16} /> Shipping & Delivery
          </button>
          <button 
            className={`legal-tab-btn ${activeTab === 'returns' ? 'active' : ''}`}
            onClick={() => setActiveTab('returns')}
          >
            <RotateCcw size={16} /> Returns & Refunds
          </button>
          <button 
            className={`legal-tab-btn ${activeTab === 'bis' ? 'active' : ''}`}
            onClick={() => setActiveTab('bis')}
          >
            <CheckCircle2 size={16} /> BIS IS-9873 Certification
          </button>
        </div>

        {/* Tab Content Panes */}
        <div className="legal-content-card">
          {activeTab === 'terms' && (
            <section className="legal-section">
              <h2>1. Terms of Service & Commercial Usage</h2>
              <p className="effective-date">Last Updated: October 2026 | Governing Law: Republic of India</p>
              
              <div className="policy-block">
                <h3>1.1 Corporate Entity</h3>
                <p>
                  ToyVerse Retail India Private Limited ("ToyVerse", "we", "us") is an Indian entity registered under the Companies Act, 2013, with its registered corporate office at Indiranagar, Bangalore, Karnataka 560038, India. GSTIN: <strong>29AAACT9821Q1Z4</strong>.
                </p>
              </div>

              <div className="policy-block">
                <h3>1.2 Statutory Invoicing & GST Taxes</h3>
                <p>
                  All toy sales are accompanied by a digitally signed GST Tax Invoice conforming to Rule 46 of the CGST Rules, 2017. Toys cataloged on ToyVerse fall under <strong>HSN Code 9503</strong> and attract an aggregate Goods & Services Tax of 18% (split as 9% CGST + 9% SGST for intra-state Karnataka transactions, or 18% IGST for interstate dispatches). Prices displayed on product cards are inclusive of statutory GST.
                </p>
              </div>

              <div className="policy-block">
                <h3>1.3 Grievance Officer Contact Details</h3>
                <p>
                  In accordance with Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020:
                </p>
                <div className="officer-box">
                  <p><strong>Name:</strong> Rajesh Sundaram</p>
                  <p><strong>Designation:</strong> Chief Grievance Redressal Officer</p>
                  <p><strong>Email:</strong> grievance@toyverse.in | <strong>Toll-Free Helpline:</strong> 1800-419-8697</p>
                  <p><strong>Address:</strong> ToyVerse Campus, 100 Feet Rd, HAL 2nd Stage, Indiranagar, Bangalore 560038</p>
                  <p><em>Turnaround Time: Acknowledgement within 48 hours; resolution within 30 days.</em></p>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'privacy' && (
            <section className="legal-section">
              <h2>2. Digital Personal Data Protection Policy</h2>
              <p className="effective-date">Compliant with the Digital Personal Data Protection (DPDP) Act, 2023</p>

              <div className="policy-block">
                <h3>2.1 Data Collection & Lawful Processing</h3>
                <p>
                  We only collect data necessary to fulfill delivery orders, issue statutory invoices, and provide authentication: name, delivery address, pincode, contact telephone, and email. We do not store raw credit/debit card numbers or UPI MPINs. Payment processing occurs through PCI-DSS Level 1 compliant tokenized gateway channels.
                </p>
              </div>

              <div className="policy-block">
                <h3>2.2 Child Safety & Parental Consent</h3>
                <p>
                  ToyVerse sells toys suitable for minors, but purchases must be made by adults (aged 18 or older). We do not collect or track behavioral tracking cookies of children or display targeted behavioral ads to minors.
                </p>
              </div>

              <div className="policy-block">
                <h3>2.3 Data Retention & Rights</h3>
                <p>
                  Customers have the right to request access to their collected data, request corrections, or request deletion of their account profile by contacting privacy@toyverse.in.
                </p>
              </div>
            </section>
          )}

          {activeTab === 'shipping' && (
            <section className="legal-section">
              <h2>3. Shipping & Delivery Policy</h2>
              <p className="effective-date">Pan-India Express Logistics</p>

              <div className="policy-block">
                <h3>3.1 Serviceable Regions & Courier Partners</h3>
                <p>
                  ToyVerse delivers to over 19,000 pincodes across all Indian states and Union Territories through tier-1 logistics partners: <strong>Delhivery, Blue Dart, DTDC, XpressBees, and India Post Speed Post</strong>.
                </p>
              </div>

              <div className="policy-block">
                <h3>3.2 Delivery Timelines & Tracking</h3>
                <ul>
                  <li><strong>Metro Cities (Bangalore, Mumbai, Delhi-NCR, Chennai, Hyderabad):</strong> 2 to 3 business days.</li>
                  <li><strong>Tier 2 & 3 Cities:</strong> 3 to 5 business days.</li>
                  <li><strong>North-East & Remote Regions:</strong> 5 to 7 business days via India Post.</li>
                </ul>
                <p>Real-time Air Waybill (AWB) numbers are dispatched via SMS & Email within 24 hours of dispatch.</p>
              </div>

              <div className="policy-block">
                <h3>3.3 Free Shipping Threshold</h3>
                <p>All prepaid or Cash on Delivery (COD) orders over ₹999 qualify for Free Standard Delivery. Orders below ₹999 incur a standard nominal fulfillment charge of ₹99.</p>
              </div>
            </section>
          )}

          {activeTab === 'returns' && (
            <section className="legal-section">
              <h2>4. Returns, Replacements & Refund Policy</h2>
              <p className="effective-date">7-Day Hassle-Free Indian Return Window</p>

              <div className="policy-block">
                <h3>4.1 Return & Replacement Eligibility</h3>
                <p>
                  Customers may request a replacement or return within 7 calendar days of delivery if the toy is received damaged, functionally defective, missing pieces, or different from the catalog description.
                </p>
              </div>

              <div className="policy-block">
                <h3>4.2 Reverse Pickup Process</h3>
                <p>
                  Our courier partners will schedule a doorstep reverse pickup within 48 hours of return approval at no extra cost to the buyer. Toys must retain original packaging, manuals, and accessories.
                </p>
              </div>

              <div className="policy-block">
                <h3>4.3 Refund Settlement Timelines</h3>
                <p>
                  Once returned items pass warehouse quality checks, refunds are credited back to the source account:
                </p>
                <ul>
                  <li><strong>UPI / Net Banking / Cards:</strong> 2 to 4 business days.</li>
                  <li><strong>Cash on Delivery (COD):</strong> Direct NEFT/IMPS bank transfer or instant ToyVerse Store Credits within 24 hours.</li>
                </ul>
              </div>
            </section>
          )}

          {activeTab === 'bis' && (
            <section className="legal-section">
              <h2>5. Quality Assurance & BIS IS-9873 Certification</h2>
              <p className="effective-date">Mandatory Safety Compliance for Toys in India</p>

              <div className="policy-block">
                <h3>5.1 Indian Quality Control Order (QCO) Compliance</h3>
                <p>
                  In compliance with the Toys (Quality Control) Order, 2020 issued by the Ministry of Commerce & Industry, all toys sold on ToyVerse strictly conform to:
                </p>
                <ul>
                  <li><strong>IS-9873 (Part 1):</strong> Safety of Toys — Mechanical and physical properties.</li>
                  <li><strong>IS-9873 (Part 2):</strong> Flammability safety tests.</li>
                  <li><strong>IS-9873 (Part 3):</strong> Migration of certain toxic elements (lead, mercury, cadmium, arsenic).</li>
                  <li><strong>IS-15644:</strong> Electric toy safety for battery-operated STEM kits and RC drones.</li>
                </ul>
              </div>

              <div className="policy-block">
                <h3>5.2 GI Craftsmanship Guarantee</h3>
                <p>
                  Our traditional wooden toys are procured directly from certified artisans in Channapatna (Karnataka) and Etikoppaka (Andhra Pradesh) crafted with non-toxic vegetable dyes, ivory wood, and natural lac finishes.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
