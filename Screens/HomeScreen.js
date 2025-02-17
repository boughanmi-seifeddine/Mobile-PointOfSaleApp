import { ActivityIndicator, Animated, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { FontAwesome6 } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useBudget } from '../BudgetContext';
import * as CryptoJS from 'crypto-js';
import { useSync } from '../SyncContext';
import { TapGestureHandler, GestureHandlerRootView, State } from 'react-native-gesture-handler';

const HomeScreen = () => {
  const navigation = useNavigation();
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const { initialBudget } = useBudget();
  const { isSyncing } = useSync();
  const { setIsSyncing } = useSync();
  const [taxes, setTaxes] = useState([]);
  const [customers , setCustomers] = useState([]);
  const [saleOrderLogs, setSaleOrderLogs] = useState([]);
  const [saleInvoiceLogs, setSaleInvoiceLogs] = useState([]);
  const [paymentEntryLogs, setPaymentEntryLogs] = useState([]);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [salesOrderCount, setSalesOrderCount] = useState(0);
  const [deliveriesCount, setDeliveriesCount] = useState(0);
  const { isAutoSync } = useSync();
  const [disabledButton, setDisabledButton] = useState(false);


  const getHash = (data) => {
    return CryptoJS.MD5(JSON.stringify(data)).toString();
  };

  const createMetadataTable = async () => {
    await db.runAsync(`
        CREATE TABLE IF NOT EXISTS TaxesMetadata (
            id INTEGER PRIMARY KEY,
            data_hash TEXT
        );
    `);
    const rowCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM TaxesMetadata;');
    if (rowCount.count === 0) {
        await db.runAsync('INSERT INTO TaxesMetadata (id, data_hash) VALUES (1, "");');
    }
};

  const getTaxesfromAPI = async () => {
    try{
        // const response = await fetch('http://195.201.138.202:8006/api/resource/Sales Taxes and Charges Template?fields=["*"]', {
        //     method: 'GET',
        //     headers: {
        //         'Authorization': 'token 24bc69a89bf17da:29ed338c3ace08c',
        //     },
        // });
        // const response = await fetch('http://192.168.1.12:8002/api/resource/Sales Taxes and Charges Template?fields=["*"]', {
        const response = await fetch('http://192.168.100.6:8002/api/resource/Sales Taxes and Charges Template?fields=["*"]', {
            method: 'GET',
            headers: {
                'Authorization': 'token 94c0faa6066a7c0:982654458dc9011',
            },
        });

        const json = await response.json();
        
        const newHash = getHash(json.data);

        const existingHash = await db.getFirstAsync('SELECT data_hash FROM TaxesMetadata WHERE id = 1;');
        if (existingHash.data_hash !== newHash) {

            await Promise.all(taxes.map(async (tax) => {
                await db.runAsync(`DELETE FROM Tax_Categories WHERE name = ?;`, [tax.name]);
            }));

            await saveInLocalTaxes(json.data);
            await db.runAsync('UPDATE TaxesMetadata SET data_hash = ? WHERE id = 1;', [newHash]);
            setTaxes(json.data);
        }
        return json.data;
    } catch (error){
        console.log('error fetching taxes',error);
    }
  };

  const saveInLocalTaxes = async (taxes) => {
    try{

        await Promise.all(taxes.map(async (tax) => {
          await db.runAsync(`INSERT OR REPLACE INTO Tax_Categories
            (
                name, creation, modified, modified_by, owner,
                docstatus, idx, title, is_default, disabled,
                company, tax_category, user_tags, _comments, _assign,
                _liked_by
            ) VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?)`,
            [
                tax.name, tax.creation, tax.modified, tax.modified_by, tax.owner,
                tax.docstatus, tax.idx, tax.title, tax.is_default, tax.disabled,
                tax.company, tax.tax_category, tax.user_tags, tax._comments, tax._assign,
                tax._liked_by 
            ]
          );
        }));
    }catch(e){
        console.log('Error saving taxes to local database', e);
    }
  };

  const getCustomersfromAPI = async () => {
    try{
      // const response = await fetch('http://195.201.138.202:8006/api/resource/Customer?fields=["*"]', {
      //     method: 'GET',
      //     headers: {
      //         'Authorization': 'token 24bc69a89bf17da:29ed338c3ace08c',
      //     },
      // });
      // const response = await fetch('http://192.168.1.12:8002/api/resource/Customer?fields=["*"]', {
      const response = await fetch('http://192.168.100.6:8002/api/resource/Customer?fields=["*"]', {
          method: 'GET',
          headers: {
              'Authorization': 'token 94c0faa6066a7c0:982654458dc9011',
          },
      });
      const json = await response.json();
      
      const newHash = getHash(json.data);

      const existingHash = await db.getFirstAsync('SELECT data_hash FROM CustomerMetadata WHERE id = 1;');
      if (existingHash.data_hash !== newHash) {

          await Promise.all(customers.map(async (customer) => {
              const syncedCustomer = await db.getFirstAsync(`SELECT synced FROM Customers WHERE name = ?;`, [customer.name]);
              if (syncedCustomer.synced === 1) {

                  return;
              }
              await db.runAsync(`DELETE FROM Customers WHERE name = ?;`, [customer.name]);
          }));

          await saveInLocalCustomers(json.data);
          await db.runAsync('UPDATE CustomerMetadata SET data_hash = ? WHERE id = 1;', [newHash]);
          setCustomers(json.data);
      }
      return json.data;
    } catch (error){
      console.log('error fetching customers',error);
    }
  };

  const saveInLocalCustomers = async (customers) => {
    try{
      await Promise.all(customers.map(async (customer) => {
          let customer_synced = 1;
          await db.runAsync(`INSERT OR REPLACE INTO Customers 
                  (
                      name, creation, modified, modified_by, owner,
                      docstatus, idx, naming_series, salutation, customer_name, customer_type,
                      customer_group, territory, gender, lead_name, opportunity_name,
                      account_manager, image, default_price_list, default_bank_account, default_currency,
                      is_internal_customer, represents_company, market_segment, industry, customer_pos_id,
                      website, language, customer_details, customer_primary_contact, mobile_no,
                      email_id, customer_primary_address, primary_address, tax_id, tax_category,
                      tax_withholding_category, payment_terms, loyalty_program, loyalty_program_tier, default_sales_partner,
                      default_commission_rate, so_required, dn_required, is_frozen, disabled,
                      _user_tags, _comments, _assign, _liked_by, custom_nrc,
                      custom_nic, custom_nai, custom_code, custom_address, custom_phone,
                      custom_nif, custom_stateprovince, custom_fax, custom_activity, custom_email_address,
                      custom_credit_limit, custom_register, custom_deadlines_to_max_in_nb_day, custom_total_unpaid, custom_capital_stock,
                      custom_item, synced
                  ) VALUES (
                      ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?,
                      ?, ?)`,
                  [
                      customer.name, customer.creation, customer.modified, customer.modified_by, customer.owner,
                      customer.docstatus, customer.idx, customer.naming_series, customer.salutation, customer.customer_name, customer.customer_type,
                      customer.customer_group, customer.territory, customer.gender, customer.lead_name, customer.opportunity_name,
                      customer.account_manager, customer.image, customer.default_price_list, customer.default_bank_account, customer.default_currency,
                      customer.is_internal_customer, customer.represents_company, customer.market_segment, customer.industry, customer.customer_pos_id,
                      customer.website, customer.language, customer.customer_details, customer.customer_primary_contact, customer.mobile_no,
                      customer.email_id, customer.customer_primary_address, customer.primary_address, customer.tax_id, customer.tax_category,
                      customer.tax_withholding_category, customer.payment_terms, customer.loyalty_program, customer.loyalty_program_tier, customer.default_sales_partner,
                      customer.default_commission_rate, customer.so_required, customer.dn_required, customer.is_frozen, customer.disabled,
                      customer._user_tags, customer._comments, customer._assign, customer._liked_by, customer.custom_nrc,
                      customer.custom_nic, customer.custom_nai, customer.custom_code, customer.custom_address, customer.custom_phone,
                      customer.custom_nif, customer.custom_stateprovince, customer.custom_fax, customer.custom_activity, customer.custom_email_address,
                      customer.custom_credit_limit, customer.custom_register, customer.custom_deadlines_to_max_in_nb_day, customer.custom_total_unpaid, customer.custom_capital_stock,
                      customer.custom_item, customer_synced
                  ]
              );
      }));
    }catch(e){
      console.log('Error saving customers to local database', e);
    }
  };



  const syncSaleOrderWithServer = async(log) => {
    try{
      // const response = await fetch('http://192.168.1.12:8002/api/method/frappe.desk.form.save.savedocs',
      const response = await fetch(
        'http://192.168.100.6:8002/api/method/frappe.desk.form.save.savedocs',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'token 94c0faa6066a7c0:982654458dc9011'
            },
            body: JSON.stringify({
                "doc": log.data,  
                "action": "Save"
            })
        }
      );
    
    // const response = await fetch(
    //     'http://195.201.138.202:8006/api/method/frappe.desk.form.save.savedocs',
    //     {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'Authorization': 'token 24bc69a89bf17da:29ed338c3ace08c'
    //         },
    //         body: JSON.stringify({
    //             "doc": JSON.stringify(log.data),  
    //             "action": "Save"
    //         })
    //     }
    // );
      if(response.ok){
        response.json().then(async (data) => {
            console.log("saved to draft sale order", data.docs[0].name);
            await db.runAsync(`UPDATE sales_order_logs SET state= ? WHERE id = ?;`, ["Draft", log.id]);
            console.log(
                {
                    "doc": JSON.stringify(data.docs[0]),  
                    "action": "Submit"
                }
            );
            try{
                // const response = await fetch('http://192.168.1.12:8002/api/method/frappe.desk.form.save.savedocs',
                const response = await fetch(
                    'http://192.168.100.6:8002/api/method/frappe.desk.form.save.savedocs',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'token 94c0faa6066a7c0:982654458dc9011'
                    },
                    body: JSON.stringify({
                        "doc": JSON.stringify(data.docs[0]),  
                        "action": "Submit"
                    })
                })
                console.log("Submitting sale order...", data.docs[0].name);
                if(response.ok){
                    const data =await response.json();

                        await db.runAsync(`UPDATE payment_entry_logs SET associatedSaleOrder=? WHERE associatedSaleOrder=?`, [data.docs[0].name, log.name]);

                        orderTosync= await db.getFirstAsync(`SELECT * FROM Sales_Order WHERE name= ?`,[log.name]);
                        await db.runAsync(`INSERT INTO Sales_Order(
                            name, owner,
                            docstatus, title, naming_series, customer,
                            customer_name, order_type, transaction_date, delivery_date,
                            company, skip_delivery_note, currency, selling_price_list,
                            set_warehouse,
                            total_qty, total_net_weight, base_total, base_net_total,
                            total, net_total, tax_category, taxes_and_charges,
                            base_total_taxes_and_charges, total_taxes_and_charges, base_grand_total,
                            base_rounding_adjustment, base_rounded_total, base_in_words, grand_total, rounding_adjustment,
                            rounded_total, in_words, advance_paid, disable_rounded_total, apply_discount_on,
                            base_discount_amount, discount_amount,
                            customer_address, customer_group, territory,
                            status, delivery_status,
                            billing_status,
                            amount_eligible_for_commission,
                            group_same_items,
                            language, is_internal_customer,
                            party_account_currency
                        ) VALUES (
                            ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?,
                            ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?,
                            ?, ?, ?,
                            ?, ?,
                            ?,
                            ?,
                            ?,
                            ?, ?,
                            ?
                        )`,
                            [
                                data.docs[0].name, orderTosync.owner,
                                orderTosync.docstatus, orderTosync.title, orderTosync.naming_series, orderTosync.customer,
                                orderTosync.customer_name, orderTosync.order_type, orderTosync.transaction_date, orderTosync.delivery_date,
                                orderTosync.company, orderTosync.skip_delivery_note, orderTosync.currency, orderTosync.selling_price_list,
                                orderTosync.set_warehouse,
                                orderTosync.total_qty, orderTosync.total_net_weight, orderTosync.base_total, orderTosync.base_net_total,
                                orderTosync.total, orderTosync.net_total, orderTosync.tax_category, orderTosync.taxes_and_charges,
                                orderTosync.base_total_taxes_and_charges, orderTosync.total_taxes_and_charges, orderTosync.base_grand_total,
                                orderTosync.base_rounding_adjustment, orderTosync.base_rounded_total, orderTosync.base_in_words, orderTosync.grand_total, orderTosync.rounding_adjustment,
                                orderTosync.rounded_total, orderTosync.in_words, orderTosync.advance_paid, orderTosync.disable_rounded_total, orderTosync.apply_discount_on,
                                orderTosync.base_discount_amount, orderTosync.discount_amount,
                                orderTosync.customer_address, orderTosync.customer_group, orderTosync.territory,
                                orderTosync.status, orderTosync.delivery_status,
                                orderTosync.billing_status,
                                orderTosync.amount_eligible_for_commission,
                                orderTosync.group_same_items,
                                orderTosync.language, orderTosync.is_internal_customer,
                                orderTosync.party_account_currency
                            ]
                        );
                        await db.runAsync(`DELETE FROM Sales_Order WHERE name = ?`, [log.name]);
                        await db.runAsync(`UPDATE Sales_Order_Item SET parent=? WHERE parent=?`,[data.docs[0].name, log.name]);
                        await db.runAsync(`UPDATE Sales_Taxes_and_Charges SET parent=? WHERE parent=?`,[data.docs[0].name, log.name]);
                        await db.runAsync(`UPDATE sales_order_logs SET state= ? WHERE id = ?;`, ["Submitted", log.id]);
                        await db.runAsync(`DELETE FROM sales_order_logs WHERE id = ?;`, [log.id]);
                        console.log("Synced sale order succesfully and deleted from local logs", data.docs[0].name);
                }else{
                    console.log("Failed to sync sale order with server", await response.text());
                    return "data.docs[0].name";
                }
            }catch(e){
                console.log("Failed to submit sale order", e);
                  return "data.docs[0].name";
              }
        });
      }else{
        console.log("Error from the server sale invoice", await response.text());
      }
    }catch(e){
      console.log('Error syncing sale orders with server', e);
    }
  };

  const syncSaleInvoiceWithServer = async(log) => {
    try{
      // const response = await fetch('http://192.168.1.12:8002/api/method/frappe.desk.form.save.savedocs',
      const response = await fetch(
        'http://192.168.100.6:8002/api/method/frappe.desk.form.save.savedocs',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'token 94c0faa6066a7c0:982654458dc9011'
            },
            body: JSON.stringify({
                "doc": log,  
                "action": "Save"
            })
        }
      );
      console.log(JSON.stringify({
        "doc": log,  
        "action": "Save"
      }));
    
    // const response = await fetch(
    //     'http://195.201.138.202:8006/api/method/frappe.desk.form.save.savedocs',
    //     {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'Authorization': 'token 24bc69a89bf17da:29ed338c3ace08c'
    //         },
    //         body: JSON.stringify({
    //             "doc": JSON.stringify(log.data),  
    //             "action": "Save"
    //         })
    //     }
    // );
    console.log(response.ok);
      if(response.ok){
        response.json().then(async (data) => {
            
            console.log(data.docs[0]);
        

            await db.runAsync(`UPDATE sales_invoice_logs SET state= ? WHERE id = ?;`, ["Draft", log.id]);
            console.log("Submitted sale invoice successfully and updated log state");
            console.log(
                {
                    "doc": JSON.stringify(data.docs[0]),  
                    "action": "Submit"
                }
            );
            try{
                // response = await fetch('http://192.168.1.12:8002/api/method/frappe.desk.form.save.savedocs',
                const response = await fetch(
                    'http://192.168.100.6:8002/api/method/frappe.desk.form.save.savedocs',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'token 94c0faa6066a7c0:982654458dc9011'
                    },
                    body: JSON.stringify({
                        "doc": JSON.stringify(data.docs[0]),  
                        "action": "Submit"
                    })
                })
                if(response.ok){
                    const data =await response.json();
                      console.log("response name",data.docs[0].name);
                        invoiceTosync= await db.getFirstAsync(`SELECT * FROM Sales_Invoice WHERE name= ?`,[log.name]);
                        await db.runAsync(`INSERT INTO Sales_Invoice(
                          name, owner,
                          docstatus, idx, naming_series, customer,
                          customer_name, posting_date, posting_time,
                          set_posting_time, due_date, is_pos, is_consolidated, is_return,
                          update_outstanding_for_self, update_billed_amount_in_sales_order, update_billed_amount_in_delivery_note, is_debit_note,
                          currency, conversion_rate,
                          selling_price_list, price_list_currency, plc_conversion_rate, ignore_pricing_rule,
                          update_stock, set_warehouse, total_qty, total_net_weight,
                          base_total, base_net_total, total, net_total, tax_category,
                          taxes_and_charges, base_total_taxes_and_charges,
                          total_taxes_and_charges, base_grand_total, base_rounding_adjustment, base_rounded_total, base_in_words,
                          grand_total, rounding_adjustment, use_company_roundoff_cost_center, rounded_total, in_words,
                          total_advance, outstanding_amount, disable_rounded_total, apply_discount_on, base_discount_amount,
                          is_cash_or_non_trade_discount, additional_discount_percentage, discount_amount, other_charges_calculation,
                          total_billing_hours, total_billing_amount, base_paid_amount, paid_amount,
                          base_change_amount, change_amount, account_for_change_amount, allocate_advances_automatically, only_include_allocated_payments,
                          write_off_amount, base_write_off_amount, write_off_outstanding_amount_automatically, write_off_account, write_off_cost_center,
                          redeem_loyalty_points, loyalty_points, loyalty_amount,
                          customer_address,
                          territory,
                          ignore_default_payment_terms_template,
                          debit_to, party_account_currency, is_opening,
                          amount_eligible_for_commission, commission_rate, total_commission,
                          group_same_items, language,
                          status,
                          customer_group, is_internal_customer, is_discounted,
                          repost_required
                        ) VALUES (
                          ?, ?,
                          ?, ?, ?, ?,
                          ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?,
                          ?, ?,
                          ?, ?, ?, ?,
                          ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?,
                          ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?,
                          ?,
                          ?,
                          ?,
                          ?, ?, ?,
                          ?, ?, ?,
                          ?, ?,
                          ?,
                          ?, ?, ?,
                          ?
                          )`,
                        [
                          data.docs[0].name, invoiceToSync.owner,
                          invoiceToSync.docstatus, invoiceToSync.idx, invoiceToSync.naming_series, invoiceToSync.customer,
                          invoiceToSync.customer_name, invoiceToSync.posting_date, invoiceToSync.posting_time,
                          invoiceToSync.set_posting_time, invoiceToSync.due_date, invoiceToSync.is_pos, invoiceToSync.is_consolidated, invoiceToSync.is_return,
                          invoiceToSync.update_outstanding_for_self, invoiceToSync.update_billed_amount_in_sales_order, invoiceToSync.update_billed_amount_in_delivery_note, invoiceToSync.is_debit_note,
                          invoiceToSync.currency, invoiceToSync.conversion_rate,
                          invoiceToSync.selling_price_list, invoiceToSync.price_list_currency, invoiceToSync.plc_conversion_rate, invoiceToSync.ignore_pricing_rule,
                          invoiceToSync.update_stock, invoiceToSync.set_warehouse, invoiceToSync.total_qty, invoiceToSync.total_net_weight,
                          invoiceToSync.base_total, invoiceToSync.base_net_total, invoiceToSync.total, invoiceToSync.net_total, invoiceToSync.tax_category,
                          invoiceToSync.taxes_and_charges, invoiceToSync.base_total_taxes_and_charges,
                          invoiceToSync.total_taxes_and_charges, invoiceToSync.base_grand_total, invoiceToSync.base_rounding_adjustment, invoiceToSync.base_rounded_total, invoiceToSync.base_in_words,
                          invoiceToSync.grand_total, invoiceToSync.rounding_adjustment, invoiceToSync.use_company_roundoff_cost_center, invoiceToSync.rounded_total, invoiceToSync.in_words,
                          invoiceToSync.total_advance, invoiceToSync.outstanding_amount, invoiceToSync.disable_rounded_total, invoiceToSync.apply_discount_on, invoiceToSync.base_discount_amount,
                          invoiceToSync.is_cash_or_non_trade_discount, invoiceToSync.additional_discount_percentage, invoiceToSync.discount_amount, invoiceToSync.other_charges_calculation,
                          invoiceToSync.total_billing_hours, invoiceToSync.total_billing_amount, invoiceToSync.base_paid_amount, invoiceToSync.paid_amount,
                          invoiceToSync.base_change_amount, invoiceToSync.change_amount, invoiceToSync.account_for_change_amount, invoiceToSync.allocate_advances_automatically, invoiceToSync.only_include_allocated_payments,
                          invoiceToSync.write_off_amount, invoiceToSync.base_write_off_amount, invoiceToSync.write_off_outstanding_amount_automatically, invoiceToSync.write_off_account, invoiceToSync.write_off_cost_center,
                          invoiceToSync.redeem_loyalty_points, invoiceToSync.loyalty_points, invoiceToSync.loyalty_amount,
                          invoiceToSync.customer_address,
                          invoiceToSync.territory,
                          invoiceToSync.ignore_default_payment_terms_template,
                          invoiceToSync.debit_to, invoiceToSync.party_account_currency, invoiceToSync.is_opening,
                          invoiceToSync.amount_eligible_for_commission, invoiceToSync.commission_rate, invoiceToSync.total_commission,
                          invoiceToSync.group_same_items, invoiceToSync.language,
                          invoiceToSync.status,
                          invoiceToSync.customer_group, invoiceToSync.is_internal_customer, invoiceToSync.is_discounted,
                          invoiceToSync.repost_required
                        ]
                      );
                      await db.runAsync(`DELETE FROM Sales_Invoice WHERE name = ?`, [log.name]);
                      await db.runAsync(`UPDATE Sales_Invoice_Item SET parent=? WHERE parent=?`,[data.docs[0].name, log.name]);
                      await db.runAsync(`UPDATE Sales_Taxes_and_Charges SET parent=? WHERE parent=?`,[data.docs[0].name, log.name]);
                      // await db.runAsync(`DELETE FROM sales_invoice_logs WHERE id = ?;`, [log.id]);
                      await db.runAsync(`UPDATE sales_invoice_logs SET state= ? WHERE id = ?;`, ["submitted", log.id]);
                      console.log("Synced sale invoice successfully and deleted from local logs");
                }else{
                    console.log("Failed to sync sale invoice with server", await response.text());
                }
            }catch(e){
                console.log("Failed to submit sale invoice", e);
            }
        });
      }else{
        console.log("Error from the server sales invoice", await response.text());
      }
    }catch(e){
      console.log('Error syncing sales invoice with server', e);
    }
  };

  const syncPaymentEntryWithServer = async(log) => {
    try{
      // const response = await fetch('http://192.168.1.12:8002/api/method/frappe.desk.form.save.savedocs',
      const response = await fetch(
        'http://192.168.100.6:8002/api/method/frappe.desk.form.save.savedocs',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'token 94c0faa6066a7c0:982654458dc9011'
            },
            body: JSON.stringify({
                "doc": log.data,  
                "action": "Save"
            })
        }
      );
      console.log(JSON.stringify({
        "doc": log.data,  
        "action": "Save"
      }));
    
    // const response = await fetch(
    //     'http://195.201.138.202:8006/api/method/frappe.desk.form.save.savedocs',
    //     {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'Authorization': 'token 24bc69a89bf17da:29ed338c3ace08c'
    //         },
    //         body: JSON.stringify({
    //             "doc": JSON.stringify(log.data),  
    //             "action": "Save"
    //         })
    //     }
    // );
    console.log(response.ok);
      if(response.ok){
        response.json().then(async (data) => {
          console.log("saved payment entry to draft", data.docs[0].name);
            await db.runAsync(`UPDATE payment_entry_logs SET state= ? WHERE id = ?;`, ["Draft", log.id]);
            console.log(
                {
                    "doc": JSON.stringify(data.docs[0]),  
                    "action": "Submit"
                }
            );
            try{
                // response = await fetch('http://192.168.1.12:8002/api/method/frappe.desk.form.save.savedocs',
                const response = await fetch(
                    'http://192.168.100.6:8002/api/method/frappe.desk.form.save.savedocs',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'token 94c0faa6066a7c0:982654458dc9011'
                    },
                    body: JSON.stringify({
                        "doc": JSON.stringify(data.docs[0]),  
                        "action": "Submit"
                    })
                })
                console.log("Submitting payment entry...", data.docs[0].name);
                if(response.ok){
                    const data =await response.json();
                        paymentTosync= await db.getFirstAsync(`SELECT * FROM Payment_Entry WHERE name= ?`,[log.name]);
                        await db.runAsync(`INSERT INTO Payment_Entry(
                          name, owner,
                          docstatus, idx, naming_series, payment_type, payment_order_status,
                          posting_date, company, mode_of_payment, party_type, party,
                          party_name, book_advance_payments_in_separate_party_account, reconcile_on_advance_payment_date,
                          paid_from,
                          paid_from_account_currency, paid_from_account_balance, paid_to, paid_to_account_type, paid_to_account_currency,
                          paid_amount, paid_amount_after_tax, source_exchange_rate, base_paid_amount,
                          base_paid_amount_after_tax, received_amount, received_amount_after_tax, target_exchange_rate, base_received_amount,
                          base_received_amount_after_tax, total_allocated_amount, base_total_allocated_amount, unallocated_amount, difference_amount,
                          apply_tax_withholding_amount, base_total_taxes_and_charges,
                          total_taxes_and_charges, reference_date,
                          status, custom_remarks,
                          is_opening
                        ) VALUES (
                          ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?,
                          ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?,
                          ?, ?,
                          ?, ?,
                          ?
                        )`,
                        [
                          data.docs[0].name, paymentTosync.owner,
                          paymentTosync.docstatus, paymentTosync.idx, paymentTosync.naming_series, paymentTosync.payment_type, paymentTosync.payment_order_status,
                          paymentTosync.posting_date, paymentTosync.company, paymentTosync.mode_of_payment, paymentTosync.party_type, paymentTosync.party,                     
                          paymentTosync.party_name, paymentTosync.book_advance_payments_in_separate_party_account, paymentTosync.reconcile_on_advance_payment_date,                   
                          paymentTosync.paid_from,
                          paymentTosync.paid_from_account_currency, paymentTosync.paid_from_account_balance, paymentTosync.paid_to, paymentTosync.paid_to_account_type, paymentTosync.paid_to_account_currency,                         
                          paymentTosync.paid_amount, paymentTosync.paid_amount_after_tax, paymentTosync.source_exchange_rate, paymentTosync.base_paid_amount,                        
                          paymentTosync.base_paid_amount_after_tax, paymentTosync.received_amount, paymentTosync.received_amount_after_tax, paymentTosync.target_exchange_rate, paymentTosync.base_received_amount,                        
                          paymentTosync.base_received_amount_after_tax, paymentTosync.total_allocated_amount, paymentTosync.base_total_allocated_amount, paymentTosync.unallocated_amount, paymentTosync.difference_amount,                         
                          paymentTosync.apply_tax_withholding_amount, paymentTosync.base_total_taxes_and_charges,                         
                          paymentTosync.total_taxes_and_charges, paymentTosync.reference_date,                          
                          paymentTosync.status, paymentTosync.custom_remarks,                       
                          paymentTosync.is_opening
                        ]
                      );
                      await db.runAsync(`DELETE FROM Payment_Entry WHERE name = ?`, [log.name]);
                      await db.runAsync(`UPDATE payment_entry_logs SET state= ? WHERE id = ?;`, ["Submitted", log.id]);
                      await db.runAsync(`DELETE FROM payment_entry_logs WHERE id = ?;`, [log.id]);
                      console.log("Synced payment entry success", data.docs[0].name);
                }else{
                    console.log("Failed to sync payment entry with server", await response.text());
                }
            }catch(e){
                console.log("Failed to submit payment entry", e);
            }
        });
      }else{
        console.log("Error from the server payment entry", await response.text());
      }
    }catch(e){
      console.log('Error syncing payment entry with server', e);
    }
  }

  const syncDeliveryWithServer = async(log) => {
    try{
      // const response = await fetch('http://192.168.1.12:8002/api/method/frappe.desk.form.save.savedocs',
      const response = await fetch(
        'http://192.168.100.6:8002/api/method/frappe.desk.form.save.savedocs',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'token 94c0faa6066a7c0:982654458dc9011'
            },
            body: JSON.stringify({
                "doc": log.data,  
                "action": "Save"
            })
        }
      );
      console.log(JSON.stringify({
        "doc": log.data,  
        "action": "Save"
      }));
    
    // const response = await fetch(
    //     'http://195.201.138.202:8006/api/method/frappe.desk.form.save.savedocs',
    //     {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'Authorization': 'token 24bc69a89bf17da:29ed338c3ace08c'
    //         },
    //         body: JSON.stringify({
    //             "doc": JSON.stringify(log.data),  
    //             "action": "Save"
    //         })
    //     }
    // );
    console.log(response.ok);
      if(response.ok){
        response.json().then(async (data) => {
          console.log("saved delivery return to draft", data.docs[0].name);
            await db.runAsync(`UPDATE delivery_note_logs SET state= ? WHERE id = ?;`, ["Draft", log.id]);
            console.log(
                {
                    "doc": JSON.stringify(data.docs[0]),  
                    "action": "Submit"
                }
            );
            try{
                // const response = await fetch('http://192.168.1.12:8002/api/method/frappe.desk.form.save.savedocs',
                const response = await fetch('http://192.168.100.6:8002/api/method/frappe.desk.form.save.savedocs',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'token 94c0faa6066a7c0:982654458dc9011'
                    },
                    body: JSON.stringify({
                        "doc": JSON.stringify(data.docs[0]),  
                        "action": "Submit"
                    })
                })
                console.log("Submitting delivery note...", data.docs[0].name);
                if(response.ok){
                    const data =await response.json();
                        deliveryTosync= await db.getFirstAsync(`SELECT * FROM Deliveries WHERE name= ?`,[log.name]);
                        await db.runAsync(`INSERT INTO Deliveries(
                          name, modified, modified_by, owner,
                          docstatus, idx, title, naming_series, customer,
                          tax_id, customer_name, posting_date, posting_time, set_posting_time,
                          company, amended_from, is_return, issue_credit_note, return_against,
                          cost_center, project, currency, conversion_rate, selling_price_list,
                          price_list_currency, plc_conversion_rate, ignore_pricing_rule, scan_barcode, pick_list,
                          set_warehouse, set_target_warehouse, total_qty, total_net_weight, base_total,
                          base_net_total, total, net_total, tax_category, taxes_and_charges,
                          shipping_rule, incoterm, named_place, base_total_taxes_and_charges, total_taxes_and_charges,
                          base_grand_total, base_rounding_adjustment, base_rounded_total, base_in_words, grand_total,
                          rounding_adjustment, rounded_total, in_words, disable_rounded_total, apply_discount_on,
                          base_discount_amount, additional_discount_percentage, discount_amount, other_charges_calculation, customer_address,
                          address_display, contact_person, contact_display, contact_mobile, contact_email,
                          shipping_address_name, shipping_address, dispatch_address_name, dispatch_address, company_address,
                          company_address_display, tc_name, terms, per_billed, status,
                          per_installed, installation_status, per_returned, transporter, driver,
                          lr_no, vehicle_no, transporter_name, driver_name, lr_date,
                          po_no, po_date, sales_partner, amount_eligible_for_commission, commission_rate,
                          total_commission, auto_repeat, letter_head, print_without_amount, group_same_items,
                          select_print_heading, language, is_internal_customer, represents_company, inter_company_reference,
                          customer_group, territory, source, campaign, excise_page,
                          instructions, _user_tags, _comments, _assign, _liked_by,
                          _seen, custom_solde, custom_total_unpaid, custom_delivery_details, custom_driver,
                          custom_driver_name, custom_vehicle
                        ) VALUES (
                          ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?, ?, ?, ?,
                          ?, ?)`,
                        [
                          data.docs[0].name, deliveryTosync.modified, deliveryTosync.modified_by, deliveryTosync.owner,
                          deliveryTosync.docstatus, deliveryTosync.idx, deliveryTosync.title, deliveryTosync.naming_series, deliveryTosync.customer,
                          deliveryTosync.tax_id, deliveryTosync.customer_name, deliveryTosync.posting_date, deliveryTosync.posting_time, deliveryTosync.set_posting_time,
                          deliveryTosync.company, deliveryTosync.amended_from, deliveryTosync.is_return, deliveryTosync.issue_credit_note, deliveryTosync.return_against,
                          deliveryTosync.cost_center, deliveryTosync.project, deliveryTosync.currency, deliveryTosync.conversion_rate, deliveryTosync.selling_price_list,
                          deliveryTosync.price_list_currency, deliveryTosync.plc_conversion_rate, deliveryTosync.ignore_pricing_rule, deliveryTosync.scan_barcode, deliveryTosync.pick_list,
                          deliveryTosync.set_warehouse, deliveryTosync.set_target_warehouse, deliveryTosync.total_qty, deliveryTosync.total_net_weight, deliveryTosync.base_total,
                          deliveryTosync.base_net_total, deliveryTosync.total, deliveryTosync.net_total, deliveryTosync.tax_category, deliveryTosync.taxes_and_charges,
                          deliveryTosync.shipping_rule, deliveryTosync.incoterm, deliveryTosync.named_place, deliveryTosync.base_total_taxes_and_charges, deliveryTosync.total_taxes_and_charges,
                          deliveryTosync.base_grand_total, deliveryTosync.base_rounding_adjustment, deliveryTosync.base_rounded_total, deliveryTosync.base_in_words, deliveryTosync.grand_total,
                          deliveryTosync.rounding_adjustment, deliveryTosync.rounded_total, deliveryTosync.in_words, deliveryTosync.disable_rounded_total, deliveryTosync.apply_discount_on,
                          deliveryTosync.base_discount_amount, deliveryTosync.additional_discount_percentage, deliveryTosync.discount_amount, deliveryTosync.other_charges_calculation, deliveryTosync.customer_address,
                          deliveryTosync.address_display, deliveryTosync.contact_person, deliveryTosync.contact_display, deliveryTosync.contact_mobile, deliveryTosync.contact_email,
                          deliveryTosync.shipping_address_name, deliveryTosync.shipping_address, deliveryTosync.dispatch_address_name, deliveryTosync.dispatch_address, deliveryTosync.company_address,
                          deliveryTosync.company_address_display, deliveryTosync.tc_name, deliveryTosync.terms, deliveryTosync.per_billed, deliveryTosync.status,
                          deliveryTosync.per_installed, deliveryTosync.installation_status, deliveryTosync.per_returned, deliveryTosync.transporter, deliveryTosync.driver,
                          deliveryTosync.lr_no, deliveryTosync.vehicle_no, deliveryTosync.transporter_name, deliveryTosync.driver_name, deliveryTosync.lr_date,
                          deliveryTosync.po_no, deliveryTosync.po_date, deliveryTosync.sales_partner, deliveryTosync.amount_eligible_for_commission, deliveryTosync.commission_rate,
                          deliveryTosync.total_commission, deliveryTosync.auto_repeat, deliveryTosync.letter_head, deliveryTosync.print_without_amount, deliveryTosync.group_same_items,
                          deliveryTosync.select_print_heading, deliveryTosync.language, deliveryTosync.is_internal_customer, deliveryTosync.represents_company, deliveryTosync.inter_company_reference,
                          deliveryTosync.customer_group, deliveryTosync.territory, deliveryTosync.source, deliveryTosync.campaign, deliveryTosync.excise_page,
                          deliveryTosync.instructions, deliveryTosync._user_tags, deliveryTosync._comments, deliveryTosync._assign, deliveryTosync._liked_by,
                          deliveryTosync._seen, deliveryTosync.custom_solde, deliveryTosync.custom_total_unpaid, deliveryTosync.custom_delivery_details, deliveryTosync.custom_driver,
                          deliveryTosync.custom_driver_name, deliveryTosync.custom_vehicle
                        ]
                      );
                      await db.runAsync(`DELETE FROM Deliveries WHERE name = ?`, [log.name]);
                      await db.runAsync(`UPDATE delivery_note_logs SET state= ? WHERE id = ?;`, ["Submitted", log.id]);
                      await db.runAsync(`DELETE FROM delivery_note_logs WHERE id = ?;`, [log.id]);
                      console.log("Synced delivery note return successfully", data.docs[0].name);
                }else{
                    console.log("Failed to sync delivery note with server", await response.text());
                }
            }catch(e){
                console.log("Failed to submit delivery note", e);
            }
        });
      }else{
        console.log("Error from the server delivery note", await response.text());
      }
    }catch(e){
      console.log('Error syncing delivery note with server', e);
    }
  };


  const syncState = async() => {
    try{
      setIsSyncing(true);
      console.log('Syncing');
      if(deliveryLogs) {
        deliveryLogs.map(async(log) => {
          if(log.state === "Submitted" ){

            console.log("already submitted to server", log.name);
          }else{
            console.log("starting syncronizing", log.name);
            await syncDeliveryWithServer(log);
          }
        });
      }  
      if (saleOrderLogs) {
          saleOrderLogs.map(async(log) => {
            if(log.state === "Submitted" ){

              console.log("already submitted to server", log.name);
            }else{
              console.log("starting syncronizing", log.name);
              await syncSaleOrderWithServer(log);
            }
        });
      };
      if (paymentEntryLogs) {
        paymentEntryLogs.map(async(paymentLog) => {
          if(paymentLog.state === "Submitted"){
            console.log("already submitted to server", paymentLog.name);
          }else {
            logData= JSON.parse(paymentLog.data);
            associatedSaleOrderName= await db.getFirstAsync(`SELECT associatedSaleOrder FROM payment_entry_logs WHERE name=?;`,[paymentLog.name]);
            //console.log(associatedSaleOrderName);
            if (associatedSaleOrderName.associatedSaleOrder.includes("SAL-ORD-")) {
              console.log("name", associatedSaleOrderName);

              logData.references.forEach(item => {
                item.reference_name = associatedSaleOrderName.associatedSaleOrder;
              });

              console.log("updated stringified logdata", JSON.stringify(logData));
              try {
                paymentLog.data = JSON.stringify(logData);
            

                await db.runAsync(`UPDATE payment_entry_logs SET data=? WHERE id=?`, [paymentLog.data, paymentLog.id]);
            
                console.log("starting syncing payment entry", paymentLog.name);
                

                await syncPaymentEntryWithServer(paymentLog);
              } catch (error) {
                console.error("Error syncing payment entry:", error);
              }
            } else {
              console.log("Failed to get associated sale order name");
            }
          }
        })   
      };
    }catch(e){
      console.log('Error syncing data with server', e);
    }finally {
      setIsSyncing(false);
      setDisabledButton(false);
    }
  };

  const handleSync= async() => {
    await syncState();
  };

  const getSaleOrderLogs = async () =>{
    try{
        const result = await db.getAllAsync('SELECT * FROM sales_order_logs;');
        setSaleOrderLogs(result);
        return result;
    }catch(error){
        console.log("Error fetching sale order logs",error);
    }
  };

  const getSaleInvoiceLogs = async () =>{
    try{
        const result = await db.getAllAsync('SELECT * FROM sales_invoice_logs;');
        setSaleInvoiceLogs(result);
    }catch(error){
        console.log("Error fetching sale invoice logs",error);
    }
  };

  const getPaymentEntryLogs = async () =>{
    try{
        const result = await db.getAllAsync('SELECT * FROM payment_entry_logs;');
        setPaymentEntryLogs(result);
    }catch(error){
        console.log("Error fetching payment entry logs",error);
    }
  };

  const getDeliveryLogs = async () => {
    try{
      const result = await db.getAllAsync('SELECT * FROM delivery_note_logs;');
      setDeliveryLogs(result);
    }catch(e){
      console.log("Error fetching delivery logs",e);
    }
  };

  const getDeliveriesCount = async () => {
    try{
      const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM Deliveries;')
      setDeliveriesCount(result.count.toString().padStart(2, '0'));
    }catch(e){
      console.log("Error getting delivery count",e);
    }
  };

  const getSalesOrderCount = async () => {
    try{
      const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM Sales_Order;')
      setSalesOrderCount(result.count.toString().padStart(2, '0'));
    }catch(e){
      console.log("Error getting sales order count",e);
    }
  };

  useEffect(() => {
    getSalesOrderCount();
    getDeliveriesCount();
  }, []);

  useEffect(()=>{
    if(saleOrderLogs){
      getSaleOrderLogs();
    }
  },[saleOrderLogs]);

  useEffect(()=>{
    if(paymentEntryLogs){
      getPaymentEntryLogs();
    }
  },[paymentEntryLogs]);

  useEffect(()=>{
    if(deliveryLogs){
      getDeliveryLogs();
    }
  },[paymentEntryLogs]);

  useEffect(() => {   
    if(isFocused){
      const initialize = async () => {
        if(isAutoSync){
          await syncState();
        }
          createMetadataTable();
          getTaxesfromAPI();
          getCustomersfromAPI();
      };
      initialize();
    }
  }, [isFocused]);

  return (
      <View style={styles.container}>
       <GestureHandlerRootView>
        {!isAutoSync && (
        <TapGestureHandler
          onHandlerStateChange={handleSync}
          enabled={!isSyncing} // Makes the button unclickable when syncing
        >
          <Text style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 12 }}>
            <FontAwesome5 name="sync" size={26} color={isSyncing ? 'gray' : 'black'} style={{ position: 'absolute', right: 30 }} />
            {isSyncing && <Text style={{ paddingLeft: 10 }}>Syncing...</Text>}
          </Text>
        </TapGestureHandler>
        )}
        </GestureHandlerRootView>
        {isSyncing && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        )}
        <View>
        <TouchableOpacity style={styles.budgetButton} title="Budget">
          <Text style={styles.budgetText}>Budget:</Text>
          <Text style={styles.budgetText}>{initialBudget} DA</Text>
          <View style={styles.budgetRow}>
            <TouchableOpacity activeOpacity={"#E59135"} style={{backgroundColor:'#FFFFFF', height:55, width:100, marginRight:20, borderRadius:10, alignItems:'center', justifyContent:'center'}}>
              <Text style={{alignItems:'center', justifyContent:'center'}}>Bon de Commande </Text>
              <Text>{salesOrderCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{backgroundColor:"#FFFFFF", height:55, width:100, borderRadius:10, alignItems:'center', justifyContent:'center'}}>
              <Text>Bon de Livraison </Text>
              <Text>{deliveriesCount}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} title="Client" onPress={() => navigation.navigate('ClientScreen')}>
            <FontAwesome6 name="people-group" size={50} color="white" />
            <Text style={styles.buttonText}>Clients</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} title="Bon de Commande" onPress={() => navigation.navigate('CommandeScreen')}>
          <FontAwesome6 name="file-invoice-dollar" size={50} color="white" />
          <Text style={styles.buttonText}>Bon de Commande</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} title="Article" onPress={() => navigation.navigate('ArticleScreen')}>
          <FontAwesome6 name="box-open" size={50} color="white" />
          <Text style={styles.buttonText}>Article</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} title="Stock" onPress={() => navigation.navigate('StockScreen')}>
          <MaterialCommunityIcons name="truck-cargo-container" size={50} color="white" />
          <Text style={styles.buttonText}>Stock</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} title="Livraison" onPress={() => navigation.navigate('LivraisonScreen')}>
          <AntDesign name="filetext1" size={50} color="white" />
          <Text style={styles.buttonText}>Bon de Livraison</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} title="Bon de Paiment" onPress={() => navigation.navigate('PaimentScreen')}>
          <FontAwesome5 name="donate" size={50} color="white" />
          <Text style={styles.buttonText}>Paiment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 10,
    backgroundColor: "#FFFFFF",
    paddingTop: 40,
    paddingLeft: 20,
  },
  row: {
    marginLeft: 25,
    flexDirection: 'row',
    marginBottom: 10,
    justifyContent: 'space-between'
  },
  buttonContainer: {
    flex: 1,
    margin: 5,
  },
  button:{
    backgroundColor: '#284979',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: 100,
  },
  buttonText:{
    color: '#fff',
    fontWeight: 'bold',
    justifyContent: 'center',
  },
  budgetButton:{
    backgroundColor: '#284979',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: 120,
    marginLeft: 30,
    marginBottom: 10,
    marginRight: 47,
  },
  budgetText:{
    color:'#FFFFFF',
    fontWeight:'bold',
  },
  budgetRow:{
    flexDirection: 'row',
    justifyContent:'space-between',
    marginTop: 10,
    borderRadius: 10,
    padding: 10,
  },
})