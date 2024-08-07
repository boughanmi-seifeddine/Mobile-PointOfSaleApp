import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { SQLiteProvider } from 'expo-sqlite';
import ClientNavigation from './Navigations/ClientNavigation';
import HomeNavigation from './Navigations/HomeNavigation';
import ProfileScreen from './Screens/ProfileScreen';
import { FontAwesome5 } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome6 } from '@expo/vector-icons';

async function initDatabase(db) {
  try{
    // await db.execAsync(`
    //   DROP TABLE IF EXISTS Customers;
    //   DROP TABLE IF EXISTS Deliveries;
    //   DROP TABLE IF EXISTS GroupItem;
    //   DROP TABLE IF EXISTS Item;
    //   DROP TABLE IF EXISTS Warehouse;
    //   DROP TABLE IF EXISTS Sales_Taxes_and_Charges;
    //   DROP TABLE IF EXISTS Sales_Order;
    //   DROP TABLE IF EXISTS Sales_Order_Item;
    //  `
    // );
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS Customers (
        name TEXT PRIMARY KEY,
        creation Date DEFAULT CURRENT_TIMESTAMP,
        modified Date DEFAULT CURRENT_TIMESTAMP,
        modified_by TEXT DEFAULT "Administrator",
        owner TEXT DEFAULT "admin@saadi.com",
        docstatus INTEGER DEFAULT 0,
        idx INTEGER DEFAULT 0,
        naming_series TEXT DEFAULT "CUST-.YYYY.-",
        salutation TEXT DEFAULT NULL,
        customer_name TEXT,
        customer_type TEXT DEFAULT NULL,
        customer_group TEXT DEFAULT NULL,
        territory TEXT,
        gender TEXT DEFAULT NULL,
        lead_name TEXT DEFAULT NULL,
        opportunity_name TEXT DEFAULT NULL,
        account_manager TEXT DEFAULT NULL,
        image BLOB DEFAULT NULL,
        default_price_list TEXT DEFAULT NULL,
        default_bank_account TEXT DEFAULT NULL,
        default_currency TEXT DEFAULT NULL,
        is_internal_customer INTEGER DEFAULT 0,
        represents_company TEXT DEFAULT NULL,
        market_segment TEXT DEFAULT NULL,
        industry TEXT DEFAULT NULL,
        customer_pos_id INTEGER DEFAULT NULL,
        website TEXT DEFAULT NULL,
        language TEXT DEFAULT 'fr',
        customer_details TEXT DEFAULT NULL,
        customer_primary_contact TEXT DEFAULT NULL,
        mobile_no INTEGER DEFAULT NULL,
        email_id TEXT DEFAULT NULL,
        customer_primary_address TEXT DEFAULT NULL,
        primary_address TEXT DEFAULT NULL,
        tax_id INTEGER DEFAULT NULL,
        tax_category TEXT DEFAULT NULL,
        tax_withholding_category TEXT DEFAULT NULL,
        payment_terms TEXT DEFAULT NULL,
        loyalty_program TEXT DEFAULT NULL,
        loyalty_program_tier TEXT DEFAULT NULL,
        default_sales_partner TEXT DEFAULT NULL,
        default_commission_rate REAL DEFAULT 0,
        so_required INTEGER DEFAULT 0,
        dn_required INTEGER DEFAULT 0,
        is_frozen INTEGER DEFAULT 0,
        disabled INTEGER DEFAULT 0,
        _user_tags TEXT DEFAULT NULL,
        _comments TEXT DEFAULT NULL,
        _assign TEXT DEFAULT NULL,
        _liked_by TEXT DEFAULT NULL,
        custom_nrc INTEGER DEFAULT NULL,
        custom_nic INTEGER DEFAULT NULL,
        custom_nai INTEGER DEFAULT NULL,
        custom_code INTEGER,
        custom_address TEXT,
        custom_phone TEXT,
        custom_nif TEXT,
        custom_stateprovince TEXT DEFAULT NULL,
        custom_fax INTEGER DEFAULT NULL,
        custom_activity TEXT,
        custom_email_address TEXT,
        custom_credit_limit REAL DEFAULT 0,
        custom_register INTEGER,
        custom_deadlines_to_max_in_nb_day INTEGER DEFAULT 0,
        custom_total_unpaid REAL DEFAULT 0,
        custom_capital_stock INTEGER DEFAULT NULL,
        custom_item INTEGER,
        synced INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS Deliveries(
        name TEXT PRIMARY KEY,
        creation DATE DEFAULT CURRENT_TIMESTAMP,
        modified DATE DEFAULT CURRENT_TIMESTAMP,
        modified_by TEXT DEFAULT "Adminstrator",
        owner TEXT DEFAULT "Adminstrator",
        docstatus INTEGER DEFAULT 0,
        idx DEFAULT 0,
        title TEXT,
        naming_series TEXT DEFAULT "MAT-DN-.YYYY.-",
        customer TEXT,
        tax_id TEXT DEFAULT NULL,
        customer_name TEXT,
        posting_date DATE DEFAULT CURRENT_DATE,
        posting_time TIME DEFAULT CURRENT_TIME,
        set_posting_time INTEGER DEFAULT 0,
        company TEXT,
        amended_from TEXT DEFAULT NULL,
        is_return INTEGER DEFAULT 0,
        issue_credit_note INTEGER DEFAULT 0,
        return_against TEXT DEFAULT NULL,
        cost_center TEXT DEFAULT NULL,
        project TEXT DEFAULT NULL,
        currency TEXT DEFAULT "DA",
        conversion_rate REAL DEFAULT 1,
        selling_price_list TEXT,
        price_list_currency TEXT DEFAULT "DA",
        plc_conversion_rate REAL DEFAULT 1,
        ignore_pricing_rule INTEGER DEFAULT 0,
        scan_barcode TEXT DEFAULT NULL,
        pick_list TEXT DEFAULT NULL,
        set_warehouse TEXT,
        set_target_warehouse TEXT DEFAULT NULL,
        total_qty INTEGER,
        total_net_weight REAL DEFAULT 0,
        base_total REAL,
        base_net_total REAL,
        total REAL,
        net_total REAL,
        tax_category TEXT DEFAULT " ",
        taxes_and_charges TEXT DEFAULT NULL,
        shipping_rule TEXT DEFAULT NULL,
        incoterm TEXT DEFAULT NULL,
        named_place TEXT DEFAULT NULL,
        base_total_taxes_and_charges REAL DEFAULT 0,
        total_taxes_and_charges REAL DEFAULT 0,
        base_grand_total REAL DEFAULT 0,
        base_rounding_adjustment REAL DEFAULT 0,
        base_rounded_total REAL DEFAULT 0,
        base_in_words TEXT DEFAULT NULL,
        grand_total REAL DEFAULT 0,
        rounding_adjustment REAL DEFAULT 0,
        rounded_total REAL DEFAULT 0,
        in_words TEXT DEFAULT NULL,
        disable_rounded_total INTEGER DEFAULT 0,
        apply_discount_on TEXT DEFAULT "Grand Total",
        base_discount_amount REAL DEFAULT 0,
        additional_discount_percentage REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        other_charges_calculation TEXT DEFAULT NULL,
        customer_address TEXT DEFAULT NULL,
        address_display TEXT DEFAULT NULL,
        contact_person TEXT DEFAULT NULL,
        contact_display TEXT DEFAULT NULL,
        contact_mobile TEXT DEFAULT NULL,
        contact_email TEXT DEFAULT NULL,
        shipping_address_name TEXT DEFAULT NULL,
        shipping_address TEXT DEFAULT NULL,
        dispatch_address_name TEXT DEFAULT NULL,
        dispatch_address TEXT DEFAULT NULL,
        company_address TEXT,
        company_address_display TEXT,
        tc_name TEXT DEFAULT NULL,
        terms TEXT DEFAULT NULL,
        per_billed INTEGER DEFAULT 0,
        status TEXT DEFAULT "To Bill",
        per_installed INTEGER DEFAULT 0,
        installation_status TEXT DEFAULT "Not Installed",
        per_returned INTEGER DEFAULT 0,
        transporter TEXT DEFAULT NULL,
        driver TEXT,
        lr_no TEXT DEFAULT NULL,
        vehicle_no TEXT,
        transporter_name TEXT DEFAULT NULL,
        driver_name TEXT,
        lr_date DATE DEFAULT CURRENT_TIMESTAMP,
        po_no TEXT DEFAULT "",
        po_date TEXT DEFAULT NULL,
        sales_partner TEXT DEFAULT NULL,
        amount_eligible_for_commission REAL,
        commission_rate REAL DEFAULT 0,
        total_commission REAL DEFAULT 0,
        auto_repeat INTEGER DEFAULT NULL,
        letter_head TEXT DEFAULT "En-Tête",
        print_without_amount INTEGER DEFAULT 0,
        group_same_items INTEGER DEFAULT 0,
        select_print_heading TEXT DEFAULT NULL,
        language TEXT DEFAULT "fr",
        is_internal_customer INTEGER DEFAULT 0,
        represents_company TEXT DEFAULT NULL,
        inter_company_reference TEXT DEFAULT NULL,
        customer_group TEXT DEFAULT "Individuel",
        territory TEXT,
        source TEXT DEFAULT NULL,
        campaign TEXT DEFAULT NULL,
        excise_page TEXT DEFAULT NULL,
        instructions TEXT DEFAULT NULL,
        _user_tags TEXT DEFAULT NULL,
        _comments TEXT DEFAULT NULL,
        _assign TEXT DEFAULT NULL,
        _liked_by TEXT DEFAULT NULL,
        _seen TEXT DEFAULT "Administrator",
        custom_solde INTEGER,
        custom_total_unpaid,
        custom_delivery_details TEXT DEFAULT NULL,
        custom_driver TEXT DEFAULT NULL,
        custom_driver_name TEXT,
        custom_vehicle TEXT
      );
      
      CREATE TABLE IF NOT EXISTS GroupItem(
      name TEXT PRIMARY KEY,
      item_group_name TEXT,
      parent_item_group TEXT
      );

      CREATE TABLE IF NOT EXISTS Item (
          name TEXT PRIMARY KEY NOT NULL,
          owner TEXT,
          creation TIMESTAMP,
          modified TIMESTAMP,
          modified_by TEXT,
          docstatus INTEGER,
          idx INTEGER,
          naming_series TEXT,
          item_code TEXT,
          item_name TEXT,
          item_group TEXT,
          stock_uom TEXT,
          disabled BOOLEAN,
          allow_alternative_item BOOLEAN,
          is_stock_item BOOLEAN,
          has_variants BOOLEAN,
          opening_stock REAL,
          valuation_rate REAL,
          standard_rate REAL,
          is_fixed_asset BOOLEAN,
          auto_create_assets BOOLEAN,
          is_grouped_asset BOOLEAN,
          asset_category TEXT,
          asset_naming_series TEXT,
          over_delivery_receipt_allowance REAL,
          over_billing_allowance REAL,
          image TEXT,
          description TEXT,
          brand TEXT,
          shelf_life_in_days INTEGER,
          end_of_life DATE,
          default_material_request_type TEXT,
          valuation_method TEXT,
          warranty_period INTEGER,
          weight_per_unit REAL,
          weight_uom TEXT,
          allow_negative_stock BOOLEAN,
          has_batch_no BOOLEAN,
          create_new_batch BOOLEAN,
          batch_number_series TEXT,
          has_expiry_date BOOLEAN,
          retain_sample BOOLEAN,
          sample_quantity REAL,
          has_serial_no BOOLEAN,
          serial_no_series TEXT,
          variant_of TEXT,
          variant_based_on TEXT,
          enable_deferred_expense BOOLEAN,
          no_of_months_exp INTEGER,
          enable_deferred_revenue BOOLEAN,
          no_of_months INTEGER,
          purchase_uom TEXT,
          min_order_qty REAL,
          safety_stock REAL,
          is_purchase_item BOOLEAN,
          lead_time_days INTEGER,
          last_purchase_rate REAL,
          is_customer_provided_item BOOLEAN,
          customer TEXT,
          delivered_by_supplier BOOLEAN,
          country_of_origin TEXT,
          customs_tariff_number TEXT,
          sales_uom TEXT,
          grant_commission BOOLEAN,
          is_sales_item BOOLEAN,
          max_discount REAL,
          inspection_required_before_purchase BOOLEAN,
          quality_inspection_template TEXT,
          inspection_required_before_delivery BOOLEAN,
          include_item_in_manufacturing BOOLEAN,
          is_sub_contracted_item BOOLEAN,
          default_bom TEXT,
          customer_code TEXT,
          default_item_manufacturer TEXT,
          default_manufacturer_part_no TEXT,
          total_projected_qty REAL,
          _comment_count INTEGER
        );

        CREATE TABLE IF NOT EXISTS Warehouse (
          name TEXT NOT NULL PRIMARY KEY,
          creation DATETIME,
          modified DATETIME,
          modified_by TEXT,
          owner TEXT,
          docstatus INTEGER DEFAULT 0 NOT NULL,
          idx INTEGER DEFAULT 0 NOT NULL,
          disabled INTEGER DEFAULT 0 NOT NULL,
          warehouse_name TEXT,
          is_group INTEGER DEFAULT 0 NOT NULL,
          parent_warehouse TEXT,
          is_rejected_warehouse INTEGER DEFAULT 0 NOT NULL,
          account TEXT,
          company TEXT,
          email_id TEXT,
          phone_no TEXT,
          mobile_no TEXT,
          address_line_1 TEXT,
          address_line_2 TEXT,
          city TEXT,
          state TEXT,
          pin TEXT,
          warehouse_type TEXT,
          default_in_transit_warehouse TEXT,
          lft INTEGER DEFAULT 0 NOT NULL,
          rgt INTEGER DEFAULT 0 NOT NULL,
          old_parent TEXT,
          _user_tags TEXT,
          _comments TEXT,
          _assign TEXT,
          _liked_by TEXT
        );

        CREATE TABLE IF NOT EXISTS Sales_Taxes_and_Charges (
          name TEXT PRIMARY KEY,
          owner TEXT,
          creation DATETIME,
          modified DATETIME,
          modified_by TEXT,
          docstatus INTEGER,
          idx INTEGER,
          charge_type TEXT,
          row_id TEXT,
          account_head TEXT,
          description TEXT,
          included_in_print_rate INTEGER,
          included_in_paid_amount INTEGER,
          cost_center TEXT,
          rate REAL,
          account_currency TEXT,
          tax_amount REAL,
          total REAL,
          tax_amount_after_discount_amount REAL,
          base_tax_amount REAL,
          base_total REAL,
          base_tax_amount_after_discount_amount REAL,
          item_wise_tax_detail TEXT,
          dont_recompute_tax INTEGER,
          parent TEXT,
          parentfield TEXT,
          parenttype TEXT
        );

        CREATE TABLE IF NOT EXISTS Sales_Order (
          name TEXT PRIMARY KEY NOT NULL,
          creation DATETIME,
          modified DATETIME,
          modified_by TEXT,
          owner TEXT,
          docstatus INTEGER DEFAULT 0 NOT NULL,
          idx INTEGER DEFAULT 0 NOT NULL,
          title TEXT DEFAULT '{customer_name}',
          naming_series TEXT,
          customer TEXT,
          customer_name TEXT,
          tax_id TEXT,
          order_type TEXT DEFAULT 'Sales',
          transaction_date DATE,
          delivery_date DATE,
          po_no TEXT,
          po_date DATE,
          company TEXT,
          skip_delivery_note INTEGER DEFAULT 0 NOT NULL,
          amended_from TEXT,
          cost_center TEXT,
          project TEXT,
          currency TEXT,
          conversion_rate REAL DEFAULT 0.0 NOT NULL,
          selling_price_list TEXT,
          price_list_currency TEXT,
          plc_conversion_rate REAL DEFAULT 0.0 NOT NULL,
          ignore_pricing_rule INTEGER DEFAULT 0 NOT NULL,
          scan_barcode TEXT,
          set_warehouse TEXT,
          reserve_stock INTEGER DEFAULT 0 NOT NULL,
          total_qty REAL DEFAULT 0.0 NOT NULL,
          total_net_weight REAL DEFAULT 0.0 NOT NULL,
          base_total REAL DEFAULT 0.0 NOT NULL,
          base_net_total REAL DEFAULT 0.0 NOT NULL,
          total REAL DEFAULT 0.0 NOT NULL,
          net_total REAL DEFAULT 0.0 NOT NULL,
          tax_category TEXT,
          taxes_and_charges TEXT,
          shipping_rule TEXT,
          incoterm TEXT,
          named_place TEXT,
          base_total_taxes_and_charges REAL DEFAULT 0.0 NOT NULL,
          total_taxes_and_charges REAL DEFAULT 0.0 NOT NULL,
          base_grand_total REAL DEFAULT 0.0 NOT NULL,
          base_rounding_adjustment REAL DEFAULT 0.0 NOT NULL,
          base_rounded_total REAL DEFAULT 0.0 NOT NULL,
          base_in_words TEXT,
          grand_total REAL DEFAULT 0.0 NOT NULL,
          rounding_adjustment REAL DEFAULT 0.0 NOT NULL,
          rounded_total REAL DEFAULT 0.0 NOT NULL,
          in_words TEXT,
          advance_paid REAL DEFAULT 0.0 NOT NULL,
          disable_rounded_total INTEGER DEFAULT 0 NOT NULL,
          apply_discount_on TEXT DEFAULT 'Grand Total',
          base_discount_amount REAL DEFAULT 0.0 NOT NULL,
          coupon_code TEXT,
          additional_discount_percentage REAL DEFAULT 0.0 NOT NULL,
          discount_amount REAL DEFAULT 0.0 NOT NULL,
          other_charges_calculation TEXT,
          customer_address TEXT,
          address_display TEXT,
          customer_group TEXT,
          territory TEXT,
          contact_person TEXT,
          contact_display TEXT,
          contact_phone TEXT,
          contact_mobile TEXT,
          contact_email TEXT,
          shipping_address_name TEXT,
          shipping_address TEXT,
          dispatch_address_name TEXT,
          dispatch_address TEXT,
          company_address TEXT,
          company_address_display TEXT,
          payment_terms_template TEXT,
          tc_name TEXT,
          terms TEXT,
          status TEXT DEFAULT 'Draft',
          delivery_status TEXT,
          per_delivered REAL DEFAULT 0.0 NOT NULL,
          per_billed REAL DEFAULT 0.0 NOT NULL,
          per_picked REAL DEFAULT 0.0 NOT NULL,
          billing_status TEXT,
          sales_partner TEXT,
          amount_eligible_for_commission REAL DEFAULT 0.0 NOT NULL,
          commission_rate REAL DEFAULT 0.0 NOT NULL,
          total_commission REAL DEFAULT 0.0 NOT NULL,
          loyalty_points INTEGER DEFAULT 0 NOT NULL,
          loyalty_amount REAL DEFAULT 0.0 NOT NULL,
          from_date DATE,
          to_date DATE,
          auto_repeat TEXT,
          letter_head TEXT,
          group_same_items INTEGER DEFAULT 0 NOT NULL,
          select_print_heading TEXT,
          language TEXT,
          is_internal_customer INTEGER DEFAULT 0 NOT NULL,
          represents_company TEXT,
          source TEXT,
          inter_company_order_reference TEXT,
          campaign TEXT,
          party_account_currency TEXT,
          _user_tags TEXT,
          _comments TEXT,
          _assign TEXT,
          _liked_by TEXT,
          _seen TEXT
        );

        CREATE TABLE IF NOT EXISTS Sales_Order_Item (
          name TEXT PRIMARY KEY NOT NULL,
          parent TEXT NOT NULL,
          parentfield TEXT,
          parenttype TEXT,
          idx INTEGER,
          item_code TEXT,
          item_name TEXT,
          description TEXT,
          qty REAL,
          stock_uom TEXT,
          rate REAL,
          amount REAL,
          base_rate REAL,
          base_amount REAL,
          warehouse TEXT,
          delivered_qty REAL,
          billed_amt REAL,
          pending_qty REAL,
          against_sales_order TEXT,
          against_sales_order_item TEXT,
          delivered_by_supplier INTEGER DEFAULT 0 NOT NULL,
          conversion_factor REAL DEFAULT 0.0 NOT NULL,
          pricing_rule TEXT,
          discount_percentage REAL DEFAULT 0.0 NOT NULL,
          gross_profit REAL DEFAULT 0.0 NOT NULL,
          gross_margin REAL DEFAULT 0.0 NOT NULL,
          against_blanket_order TEXT,
          FOREIGN KEY(parent) REFERENCES Sales_Order(name),
          FOREIGN KEY(item_code) REFERENCES Item(item_code)
        );
    `);
    console.log('Database initialized');
  }catch(error){
    console.log("Error initializing database",error);
  }
}


export default function App() {
  const Tab = createBottomTabNavigator();
  return (  
    <SQLiteProvider databaseName='myDB.db' onInit={initDatabase}>
      <NavigationContainer>
        <Tab.Navigator screenOptions={{
          tabBarStyle: { backgroundColor:'#284979', borderTopLeftRadius:15 , borderTopRightRadius:15 },
        }}>
          <Tab.Screen name="Home" component={HomeNavigation} options={{
            tabBarIcon: ({ focused }) => (
              <View>
               <FontAwesome5 name="home" size={24} color="white" />
              </View>
            ),
            tabBarOptions: {
              activeTintColor: '#284979',
              inactiveTintColor: '#FFFFFF',
            },
          }}/>
          <Tab.Screen name="Clients" component={ClientNavigation} screenOptions={{headerShown:false}} options={{
            tabBarIcon: ({ focused }) => (
              <View>
                <FontAwesome6 name="people-group" size={24} color="white" />
              </View>
            ),
            tabBarOptions: {
              activeTintColor: '#284979',
              inactiveTintColor: '#FFFFFF',
            },
            }}/>
          <Tab.Screen name="Profile" component={ProfileScreen} options={{
            tabBarIcon: ({ focused }) => (
              <View>
                <Ionicons name="person-sharp" size={24} color="white" />
              </View>
            ),
            tabBarOptions: {
              activeTintColor: '#284979',
              inactiveTintColor: '#FFFFFF',
            },
            }}/>
        </Tab.Navigator>
      </NavigationContainer>
    </SQLiteProvider>  
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});