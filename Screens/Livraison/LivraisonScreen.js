import { FlatList, TouchableOpacity, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import * as CryptoJS from 'crypto-js';
import NetInfo from '@react-native-community/netinfo';
import { useSQLiteContext } from 'expo-sqlite';

const LivraisonScreen = () => {
  const db = useSQLiteContext();

  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const Content =  () => {
      const [deliveries , setDeliveries] = useState([]);
      const [livraisons, setLivraisons] = useState([]);

      const getHash = (data) => {
        return CryptoJS.MD5(JSON.stringify(data)).toString();
      };

      const createMetadataTable = async () => {
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS DeliveryMetadata (
                id INTEGER PRIMARY KEY,
                data_hash TEXT
            );
        `);
        const rowCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM DeliveryMetadata;');
        if (rowCount.count === 0) {
            await db.runAsync('INSERT INTO DeliveryMetadata (id, data_hash) VALUES (?, ?);',[1, ""]); /// Hash of all deliveries data
        }
      };

      function transformJson(data) {
        const keys = data.message.keys;
        const values = data.message.values;
        return values.map(entry => {
            let obj = {};
            keys.forEach((key, index) => { obj[key] = entry[index]; });
            return obj; 
        }); 
      };    

      const getDeliveriesfromAPI = async () => {
          try{
            // const response = await fetch('http://192.168.1.12:8002/api/method/frappe.desk.reportview.get', 
            const response = await fetch('http://192.168.100.6:8002/api/method/frappe.desk.reportview.get', 
              {
                method: 'POST',
                headers: {
                  'Authorization': 'token 94c0faa6066a7c0:982654458dc9011',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  "doctype": "Delivery Note",
                  "fields": [
                    "*"
                  ],
                  "filters": [
                    ["Delivery Note", "set_warehouse", "=", "Magasin Fille 1 - ICD"]
                  ],
                  "order_by": "`tabDelivery Note`.`modified` desc",
                  "start": 0,
                  "page_length": 20,
                  "view": "List",
                  "group_by": "",
                  "with_comment_count": 1
                }),
            });
            //   const response = await fetch('http://195.201.138.202:8006/api/resource/Delivery Note?fields=["*"]', {
            //       method: 'GET',
            //       headers: {
            //           'Authorization': 'token 24bc69a89bf17da:29ed338c3ace08c',
            //       },
            //   });
              const data = await response.json();
              const selectedDeliveries = transformJson(data);

              const newHash = getHash(data);

                const existingHash = await db.getFirstAsync('SELECT data_hash FROM DeliveryMetadata WHERE id = ?;',[1]);
                if (existingHash.data_hash !== newHash) {
                  selectedDeliveries.map(async(delivery) => {
                    console.log(delivery.name);
                    // const response = await fetch('http://192.168.1.12:8002/api/method/frappe.desk.form.load.getdoc', 
                      const response = await fetch('http://192.168.100.6:8002/api/method/frappe.desk.form.load.getdoc',
                        {
                        method: 'POST',
                          headers: {
                            'Authorization': 'token 94c0faa6066a7c0:982654458dc9011',
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            "doctype": "Delivery Note",
                            "name": delivery.name,
                            "_": Date.now(),
                          })
                        }
                      );
                      const data = await response.json();
                      const deliveryItems = data.docs[0].items;
                      await saveInLocalDeliveryItems(deliveryItems);
                      const deliveryTaxes = data.docs[0].taxes;
                      await saveInLocalDeliveryTaxes(deliveryTaxes);
                  })
                  setDeliveries(selectedDeliveries);
                  await saveInLocalDeliveries(selectedDeliveries);
                  await db.runAsync('UPDATE DeliveryMetadata SET data_hash = ? WHERE id = ?;', [newHash, 1]);
                }
              return selectedDeliveries;
          }catch (error){
            console.log('error fetching delivery notes',error);
          }
      };

      const saveInLocalDeliveries = async (deliveries) => {
        try{
            await Promise.all(deliveries.map(async (delivery) => {
              await db.runAsync(`INSERT OR REPLACE INTO Deliveries
                (
                  name, creation, modified, modified_by, owner,
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
                    ?, ?, ?, ?, ?,
                    ?, ?)`,
                  [
                    delivery.name, delivery.creation, delivery.modified, delivery.modified_by, delivery.owner,
                    delivery.docstatus, delivery.idx, delivery.title, delivery.naming_series, delivery.customer,
                    delivery.tax_id, delivery.customer_name, delivery.posting_date, delivery.posting_time, delivery.set_posting_time,
                    delivery.company, delivery.amended_from, delivery.is_return, delivery.issue_credit_note, delivery.return_against,
                    delivery.cost_center, delivery.project, delivery.currency, delivery.conversion_rate, delivery.selling_price_list,
                    delivery.price_list_currency, delivery.plc_conversion_rate, delivery.ignore_pricing_rule, delivery.scan_barcode, delivery.pick_list,
                    delivery.set_warehouse, delivery.set_target_warehouse, delivery.total_qty, delivery.total_net_weight, delivery.base_total,
                    delivery.base_net_total, delivery.total, delivery.net_total, delivery.tax_category, delivery.taxes_and_charges,
                    delivery.shipping_rule, delivery.incoterm, delivery.named_place, delivery.base_total_taxes_and_charges, delivery.total_taxes_and_charges,
                    delivery.base_grand_total, delivery.base_rounding_adjustment, delivery.base_rounded_total, delivery.base_in_words, delivery.grand_total,
                    delivery.rounding_adjustment, delivery.rounded_total, delivery.in_words, delivery.disable_rounded_total, delivery.apply_discount_on,
                    delivery.base_discount_amount, delivery.additional_discount_percentage, delivery.discount_amount, delivery.other_charges_calculation, delivery.customer_address,
                    delivery.address_display, delivery.contact_person, delivery.contact_display, delivery.contact_mobile, delivery.contact_email,
                    delivery.shipping_address_name, delivery.shipping_address, delivery.dispatch_address_name, delivery.dispatch_address, delivery.company_address,
                    delivery.company_address_display, delivery.tc_name, delivery.terms, delivery.per_billed, delivery.status,
                    delivery.per_installed, delivery.installation_status, delivery.per_returned, delivery.transporter, delivery.driver,
                    delivery.lr_no, delivery.vehicle_no, delivery.transporter_name, delivery.driver_name, delivery.lr_date,
                    delivery.po_no, delivery.po_date, delivery.sales_partner, delivery.amount_eligible_for_commission, delivery.commission_rate,
                    delivery.total_commission, delivery.auto_repeat, delivery.letter_head, delivery.print_without_amount, delivery.group_same_items,
                    delivery.select_print_heading, delivery.language, delivery.is_internal_customer, delivery.represents_company, delivery.inter_company_reference,
                    delivery.customer_group, delivery.territory, delivery.source, delivery.campaign, delivery.excise_page,
                    delivery.instructions, delivery._user_tags, delivery._comments, delivery._assign, delivery._liked_by,
                    delivery._seen, delivery.custom_solde, delivery.custom_total_unpaid, delivery.custom_delivery_details, delivery.custom_driver,
                    delivery.custom_driver_name, delivery.custom_vehicle
                  ]
                );
              }));
          }catch(e){
            console.log('Error saving data to local database', e);
          }
    };

    const saveInLocalDeliveryItems = async (items) => {
      try{
        await Promise.all(items.map(async (item) => {
          await db.runAsync(`INSERT INTO Delivery_Note_Item(
              name, creation, modified, modified_by, owner,
              docstatus, idx, barcode, has_item_scanned, item_code,
              item_name, customer_item_code, description, brand, item_group,
              image, qty, stock_uom, uom, conversion_factor,
              stock_qty, returned_qty, price_list_rate, base_price_list_rate, margin_type,
              margin_rate_or_amount, rate_with_margin, discount_percentage, discount_amount, base_rate_with_margin,
              rate, amount, base_rate, base_amount, pricing_rules,
              stock_uom_rate, is_free_item, grant_commission, net_rate, net_amount,
              item_tax_template, base_net_rate, base_net_amount, billed_amt, incoming_rate,
              weight_per_unit, total_weight, weight_uom, warehouse, target_warehouse,
              quality_inspection, allow_zero_valuation_rate, against_sales_order, so_detail, against_sales_invoice,
              si_detail, dn_detail, pick_list_item, serial_and_batch_bundle, use_serial_batch_fields,
              serial_no, batch_no, actual_batch_qty, actual_qty, installed_qty,
              item_tax_rate, packed_qty, received_qty, expense_account, material_request,
              purchase_order, purchase_order_item, material_request_item, cost_center, project,
              page_break, parent, parentfield, parenttype
            ) VALUES (
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
              ?, ?, ?, ?
            )`,
            [
              item.name, item.creation, item.modified, item.modified_by, item.owner,
              item.docstatus, item.idx, item.barcode, item.has_item_scanned, item.item_code,
              item.item_name, item.customer_item_code, item.description, item.brand, item.item_group,
              item.image, item.qty, item.stock_uom, item.uom, item.conversion_factor,
              item.stock_qty, item.returned_qty, item.price_list_rate, item.base_price_list_rate, item.margin_type,
              item.margin_rate_or_amount, item.rate_with_margin, item.discount_percentage, item.discount_amount, item.base_rate_with_margin,
              item.rate, item.amount, item.base_rate, item.base_amount, item.pricing_rules,
              item.stock_uom_rate, item.is_free_item, item.grant_commission, item.net_rate, item.net_amount,
              item.item_tax_template, item.base_net_rate, item.base_net_amount, item.billed_amt, item.incoming_rate,
              item.weight_per_unit, item.total_weight, item.weight_uom, item.warehouse, item.target_warehouse,
              item.quality_inspection, item.allow_zero_valuation_rate, item.against_sales_order, item.so_detail, item.against_sales_invoice,
              item.si_detail, item.dn_detail, item.pick_list_item, item.serial_and_batch_bundle, item.use_serial_batch_fields,
              item.serial_no, item.batch_no, item.actual_batch_qty, item.actual_qty, item.installed_qty,
              item.item_tax_rate, item.packed_qty, item.received_qty, item.expense_account, item.material_request,
              item.purchase_order, item.purchase_order_item, item.material_request_item, item.cost_center, item.project,
              item.page_break, item.parent, item.parentfield, item.parenttype
            ]
          )
        }));
      }catch(e){
        console.log('Error saving delivery items to local database', e);
      }
    };

    const saveInLocalDeliveryTaxes = async (taxes) => {
      try{
        await Promise.all(taxes.map(async (tax) => {
          await db.runAsync(`INSERT INTO Sales_Taxes_and_Charges(
              name, owner, creation, modified, modified_by,
              docstatus, idx, charge_type, row_id, account_head,
              description, included_in_print_rate, included_in_paid_amount, cost_center, rate,
              account_currency, tax_amount, total, tax_amount_after_discount_amount, base_tax_amount,
              base_total, base_tax_amount_after_discount_amount, item_wise_tax_detail, dont_recompute_tax, parent,
              parentfield, parenttype
            ) VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?
            )`,
            [
              tax.name, tax.owner, tax.creation, tax.modified, tax.modified_by,
              tax.docstatus, tax.idx, tax.charge_type, tax.row_id, tax.account_head,
              tax.description, tax.included_in_print_rate, tax.included_in_paid_amount, tax.cost_center, tax.rate,
              tax.account_currency, tax.tax_amount, tax.total, tax.tax_amount_after_discount_amount, tax.base_tax_amount,
              tax.base_total, tax.base_tax_amount_after_discount_amount, tax.item_wise_tax_detail, tax.dont_recompute_tax, tax.parent,
              tax.parentfield, tax.parenttype
            ]
          )
        }));
      }catch(e){
        console.log('Error saving delivery taxes to local database', e);
      }
    }

    const saveToLocalLogs = async () => {
      const logs = await db.getAllAsync(`SELECT name FROM delivery_note_logs;`);
      const names = logs.map(log => log.name);

      const deliveries = await db.getAllAsync(`SELECT * FROM Deliveries;`);
      deliveries.map(async (delivery)=> {
          if(delivery.name.includes("MAT-DN")){
              console.log("already synced");
          }else{
              const deliveryData= {
                  ...delivery,
                  doctype: "Delivery Note",
                  __islocal: 1,
                  __unsaved: 1,
              }
              const deliveryItems = await db.getAllAsync(`SELECT * FROM Delivery_Note_Item WHERE parent =?`, [delivery.name]);

              const updatedItems= deliveryItems.map(item =>({
                  ...item,
                  __islocal: 1,
                  __unsaved: 1,
                  doctype: "Delivery Note Item"
              }));

              const deliveryTaxes = await db.getFirstAsync(`SELECT * FROM Sales_Taxes_and_Charges WHERE parent=?`, [delivery.name]);
              const deliveryTaxesData = {
                  ...deliveryTaxes,
                  __islocal: 1,
                  __unsaved: 1,
                  doctype: "Sales Taxes and Charges"
              }

              const data = {
                  ...deliveryData,
                  items: updatedItems,
                  taxes: [deliveryTaxesData],
              }

              console.log(data);

              if (!names.includes(delivery.name)) {
                  await db.runAsync(
                      `INSERT INTO delivery_note_logs (action, name, state, data) VALUES (?, ?, ?, ?)`,
                      ["INSERT", delivery.name, "local", JSON.stringify(data)]
                  );
                  console.log("saved to local logs", delivery.name);
              } else {
                console.log("already in log");
              }
          }
      });
    }

      const getLivraisons = async () => {
          try{
              const allLivraisons= await db.getAllAsync(`SELECT * FROM Deliveries;`);
              setLivraisons(allLivraisons);
          }catch(e){
              console.log("Error fetching all deliveries",e);
          }
      };

      const createDeliveryNoteLocalLogs = async () => {
        //await db.runAsync(`DROP TABLE IF EXISTS delivery_note_logs;`);
        await db.runAsync(`CREATE TABLE IF NOT EXISTS delivery_note_logs(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT,
                name TEXT,
                state TEXT,
                data TEXT
            )`);
      };

      useEffect(() => {
          if(isFocused){
            const initialize = async () => {
              createMetadataTable();
              createDeliveryNoteLocalLogs();
              getDeliveriesfromAPI();
              saveToLocalLogs();
            };
          initialize();
          }
      }, [isFocused]);

      useEffect(() => {
        if(isFocused) { 
          getLivraisons();
        }
      },[isFocused]);

      return (
          <View>
                  {livraisons.length=== 0 ? (
                      <Text>No data yet.</Text>
                  ) : (
                      <FlatList 
                          data ={livraisons}
                          keyExtractor={(item) => (item.name).toString()}
                          renderItem={({item}) => (
                              <TouchableOpacity style={{backgroundColor:"#FFF", padding:15, margin:10, borderRadius:10}} onPress={() => navigation.navigate('LivraisonStatus', { deliveryName: item.name })}>
                                  <View style={{marginBottom:10}}>
                                      <Text style={{fontWeight:'bold'}}>{item.name}</Text>
                                      <View style={{flexDirection:'column', justifyContent:'space-between'}}>
                                          <Text>Customer: {item.customer_name}</Text>
                                          <Text>Delivery Date: {item.posting_time}</Text>
                                          <Text>Delivery Price: {item.total}</Text>
                                          <Text>Status: {item.status}</Text>
                                      </View>
                                  </View>
                              </TouchableOpacity>
                          )}
                      />
                  )}  
          </View>
      );
  };

  return (
    <View style={styles.container}>
      <View >
        <Text style={styles.header}>List of Deliveries</Text>
        <Content style={styles.items}/>
      </View>
      <AntDesign 
        name="pluscircle" 
        size={30} 
        color="#284979" 
        style={styles.icon} 
        onPress={() => navigation.navigate('AddLivraisonScreen')}
        />
      </View>
  );
}

export default LivraisonScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    header: {
        fontSize: 24,
    },
    icon: {
        position: 'absolute',
        bottom: 30,
        right: 30,

    },
    items: {
        backgroundColor: '#fff',
    },
});