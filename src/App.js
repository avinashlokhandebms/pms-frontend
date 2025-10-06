// src/App.js
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth / guards
import ProtectedRoute from "./components/ProtectedRoute";

// Modules / dashboards
import Login from "./pages/login/Login";
import Dashboard from "./pages/module/Dashboard";
import ModulePage from "./pages/module/ModulePage";
import ReservationPage from "./pages/module/ReservationPage";
import BackofficePage from "./pages/module/BackofficePage";
import PosPage from "./pages/module/PosPage";
import FrontdeskPage from "./pages/module/FrontdeskPage";
import ReportPage from "./pages/module/ReportPage";
import InventoryPage from "./pages/module/InventoryPage";
import KdsPage from "./pages/module/KdsPage";
import HousekeepingPage from "./pages/module/HousekeepingPage";
import BookingEnginePage from "./pages/module/BookingEnginePage";


// Backoffice — Property
import PropertyProfile from "./pages/Backoffice/property/PropertyProfile";
import SalesPerson from "./pages/Backoffice/property/SalesPerson";

// Backoffice — Masters
import DesignationPage from "./pages/Backoffice/masters/Designation";
import KDSsettings from "./pages/Backoffice/masters/KDSsetting";
import Ledger from "./pages/Backoffice/masters/ledger";
import VisitPurpose from "./pages/Backoffice/masters/VisitPurpose";
import PickDropFacility from "./pages/Backoffice/masters/PickDropFacility";
import BillingInstruction from "./pages/Backoffice/masters/BillingInstruction";
import IdentityDetails from "./pages/Backoffice/masters/IdentityDetails";
import VersionPage from "./pages/Backoffice/masters/Version";
import StateMaster from "./pages/Backoffice/masters/State";
import CityMaster from "./pages/Backoffice/masters/City";
import AreaMaster from "./pages/Backoffice/masters/Area";
import ZoneMaster from "./pages/Backoffice/masters/Zone";
import TaxRateName from "./pages/Backoffice/masters/Taxratename";



// Backoffice -Settings
import NightAuditSetting from "./pages/Backoffice/setting/Nightaudit";
import CommonSetting from "./pages/Backoffice/setting/Commonsetting";
import Bookingnositting from "./pages/Backoffice/setting/Bookingnositting";
import CopyTableColumnCRM from "./pages/Backoffice/setting/Copytablecoloumcrm";
import TableColumnListCRM from "./pages/Backoffice/setting/TableColumnListCRM";
import StoreSerialNoSetting from "./pages/Backoffice/setting/StoreSerialNoSetting";



// Backoffice -CommonMaster
import UnitPage from "./pages/Backoffice/commonmaster/unit";
import SubUnitPage from "./pages/Backoffice/commonmaster/Subunit";
import FnbBillingTypePage from "./pages/Backoffice/commonmaster/FnbBillingType";
import CurrencyPage from "./pages/Backoffice/commonmaster/Currency";
import GuestTypePage from "./pages/Backoffice/commonmaster/GuestType";
import BrandPage from "./pages/Backoffice/commonmaster/Brand";
import DealsPage from "./pages/Backoffice/commonmaster/Deals";
import VoidReasonsPage from "./pages/Backoffice/commonmaster/VoidReasons";
import KotBookManualPage from "./pages/Backoffice/commonmaster/KotBookManual";
import PrinterSetPage from "./pages/Backoffice/commonmaster/PrinterSet";
import VegTypePage from "./pages/Backoffice/commonmaster/VegType";
import EmailerCreationPage from "./pages/Backoffice/commonmaster/EmailerCreation";
import EmailSettingPage from "./pages/Backoffice/commonmaster/EmailSetting";



// Backoffice -QRMenuSetting
import QRMenuSettingPage from "./pages/Backoffice/Qrmaster/QRMenuSetting";



// Backoffice -FNB
import AddPosCustomerSetting from "./pages/Backoffice/fnb/AddPosCustomerSetting";
import CouponMaster from "./pages/Backoffice/fnb/CouponMaster";
import Outlet from "./pages/Backoffice/fnb/Outlet";
import TablePage from "./pages/Backoffice/fnb/Table";
import ParentCategoryPage from "./pages/Backoffice/fnb/ParentCategory";
import CategoryPage from "./pages/Backoffice/fnb/Category";
import MenuGroupPage from "./pages/Backoffice/fnb/MenuGroup";
import ItemPage from "./pages/Backoffice/fnb/Item";
import AddItemToOutletPage from "./pages/Backoffice/fnb/AddItemToOutlet";
import OutOfStock from "./pages/Backoffice/fnb/OutOfStock";
import AddKitchen from "./pages/Backoffice/fnb/AddKitchen";
import KitchenTransferOutlet from "./pages/Backoffice/fnb/KitchenTransferOutlet";
import BanquetGroup from "./pages/Backoffice/fnb/BanquetGroup";




// Backoffice -Room
import TaxRange from "./pages/Backoffice/room/TaxRange";
import ReservationCancelSetting from "./pages/Backoffice/room/ReservationCancelSetting";
import BlockMaster from "./pages/Backoffice/room/BlockMaster";
import FloorMaster from "./pages/Backoffice/room/FloorMaster";
import RoomViewType from "./pages/Backoffice/room/RoomViewType";
import BedSize from "./pages/Backoffice/room/BedSize";
import AmenityCategory from "./pages/Backoffice/room/AmenityCategory";
import AmenitySubcategory from "./pages/Backoffice/room/AmenitySubcategory";
import RoomCategory from "./pages/Backoffice/room/RoomCategory";
import RoomPlanType from "./pages/Backoffice/room/RoomPlanType";
import RoomType from "./pages/Backoffice/room/RoomType";
import RoomNoMaster from "./pages/Backoffice/room/RoomNoMaster";




// Backoffice -Currency
import CurrencySetup from "./pages/Backoffice/currency/Setup";
import CurrencyExchange from "./pages/Backoffice/currency/Exchange";



// Backoffice -Nc
import NcCosting from "./pages/Backoffice/nc/NcCosting";
import Department from "./pages/Backoffice/nc/Department";



// Backoffice -Report
import UserList from "./pages/Backoffice/report/UserList";
import FeedbackList from "./pages/Backoffice/report/FeedbackList";




// Backoffice -Complain
import ComplainType from "./pages/Backoffice/complain/ComplainType";
import ComplainUserList from "./pages/Backoffice/complain/ComplainUserList";





// Backoffice -Production
import ProductionFinish from "./pages/Backoffice/production/ProductionFinish";
import AddProduction from "./pages/Backoffice/production/AddProduction";
import ProductionProcess from "./pages/Backoffice/production/ProductionProcess";




// Backoffice -Accounts
import LedgerExportPage from "./pages/Backoffice/accounts/LegderExport";
import VoucherExportPage from "./pages/Backoffice/accounts/VoucherExport";
import UploadEinvoicePage from "./pages/Backoffice/accounts/UploadEinvoice";




// Backoffice -Membership
import MemberShipType from "./pages/Backoffice/membership/MemberShipType";
import MemberShipService from "./pages/Backoffice/membership/MemberShipService";
import MemberShipPlan from "./pages/Backoffice/membership/MemberShipPlan";
import MemberShipSetting from "./pages/Backoffice/membership/MemberShipSetting";
// import MemberShipPlanDetails from "./pages/Backoffice/membership/MemberShipPlanDetails";




// Reservation
import NewReservation from "./pages/Reservation/NewReservation";
import ReservationDetails from "./pages/Reservation/Reservationdetails";
import ReservationStatusView from "./pages/Reservation/ReservationStatusView";
import CancelReservationList from "./pages/Reservation/CancelReservationList";
import ReservationCalendar from "./pages/Reservation/ReservationCalender";
import AdvanceDeposit from "./pages/Reservation/AdvanceDeposit";
import ReturnPaidup from "./pages/Reservation/ReturnPaidup";
import NoShowRoomReport from "./pages/Reservation/NoShowRoomReport";
import BookingSheetAccounts from "./pages/Reservation/BookingSheetAccounts";



  //Reservation-Frontoffice
  import PreRegCard from "./pages/Reservation/frontdesk/PreRegCard";
  import CheckInGuest from "./pages/Reservation/frontdesk/CheckInGuest";
  import DirectCheckInGuest from "./pages/Reservation/frontdesk/DirectCheckInGuest";
  import CheckInGuestDetails from "./pages/Reservation/frontdesk/CheckInGuestDetails";
  import PaxCheckin from "./pages/Reservation/frontdesk/PaxCheckin";
  import CancelBookingDetails from "./pages/Reservation/frontdesk/CancelBookingDetails";
  import RoomCalendar from "./pages/Reservation/frontdesk/RoomCalendar";
  import LinkedUnlinkedReport from "./pages/Reservation/frontdesk/LinkedUnlinkedReport";
  import CheckOutGuest from "./pages/Reservation/frontdesk/CheckOutGuest";
  import Calendar from "./pages/Reservation/frontdesk/Calendar";
  import GuestCheckoutExtend from "./pages/Reservation/frontdesk/GuestCheckoutExtend";




  //Housekeeping
  import RoomStatusBoard from "./pages/Housekeeping/RoomStatusBoard";
  import AssignTasks from "./pages/Housekeeping/AssignTasks";
  import CleaningSchedule from "./pages/Housekeeping/CleaningSchedule";
  import RoomInspection from "./pages/Housekeeping/RoomInspection"; 
  import TurnDownService from "./pages/Housekeeping/TurnDownService";
  import DeepCleaningPlanner from "./pages/Housekeeping/DeepCleaningPlanner";
  import LostAndFound from "./pages/Housekeeping/LostAndFound";
  import MaintenanceRequests from "./pages/Housekeeping/MaintenanceRequests";
  import LinenInventory from "./pages/Housekeeping/LinenInventory";
  import MinibarRefill from "./pages/Housekeeping/MinibarRefill";



  
  //Housekeeping-Reports
  import Productivity from "./pages/Housekeeping/Reports/Productivity";
  import StatusHistory from "./pages/Housekeeping/Reports/StatusHistory";
  import LostFoundLog from "./pages/Housekeeping/Reports/LostFoundLog";
  import MaterialsUsage from "./pages/Housekeeping/Reports/MaterialsUsage";

  

  //Pos
  import OrderEntry from "./pages/Pos/OrderEntry";
  import RunningOrders from "./pages/Pos/RunningOrders";
  import HoldUnpaid from "./pages/Pos/HoldUnpaid";
  import Cancelled from "./pages/Pos/Cancelled";



   //Pos-Tables
  import TableStatus from "./pages/Pos/Tables/TableStatus";
  import MergeSplit from "./pages/Pos/Tables/MergeSplit";
  import MoveTable from "./pages/Pos/Tables/MoveTable";


  //Pos-Kitchen
  import KOTBoard from "./pages/Pos/Kitchen/KOTBoard";
  import ReprintKOT from "./pages/Pos/Kitchen/ReprintKOT";
  import KDS from "./pages/Pos/Kitchen/KDS";



   //Pos-Billing
   import GenerateBill from "./pages/Pos/Billing/GenerateBill";
   import ReprintBill from "./pages/Pos/Billing/ReprintBill";
   import VoidReturn from "./pages/Pos/Billing/VoidReturn";



   //pos-Inventory
   import Items from "./pages/Pos/Inventory/Items";
   import StockInOut from "./pages/Pos/Inventory/StockInOut";
   import OutofStock from "./pages/Pos/Inventory/OutofStock";



   //pos-Reports
   import ZReport from "./pages/Pos/Reports/ZReport";
   import SalesSummary from "./pages/Pos/Reports/SalesSummary";
   import TaxSummary from "./pages/Pos/Reports/TaxSummary";
   import DiscountReport from "./pages/Pos/Reports/DiscountReport";



   //pos-Settings
   import Printers from "./pages/Pos/Settings/Printers";
   import Counters from "./pages/Pos/Settings/Counters";
   import PaymentModes from "./pages/Pos/Settings/PaymentModes";
   import ServiceCharge from "./pages/Pos/Settings/ServiceCharge";



   
   
   




export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Dashboard home */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Module selector page */}
        <Route path="/module/:id" element={<ModulePage />} />

        {/* Top-level modules (guarded) */}
        <Route
          path="/dashboard/reservation"
          element={
            <ProtectedRoute>
              <ReservationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/backoffice"
          element={
            <ProtectedRoute>
              <BackofficePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/frontdesk"
          element={
            <ProtectedRoute>
              <FrontdeskPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/pos"
          element={
            <ProtectedRoute>
              <PosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/report"
          element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/inventory"
          element={
            <ProtectedRoute>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/kds"
          element={
            <ProtectedRoute>
              <KdsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/booking-engine"
          element={
            <ProtectedRoute>
              <BookingEnginePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/housekeeping"
          element={
            <ProtectedRoute>
              <HousekeepingPage />
            </ProtectedRoute>
          }
        />

        

        {/* Backoffice -> Property */}
        <Route
          path="/dashboard/backoffice/masters/property"
          element={
            <ProtectedRoute>
              <PropertyProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/backoffice/masters/salesperson"
          element={
            <ProtectedRoute>
              <SalesPerson />
            </ProtectedRoute>
          }
        />

        {/* Backoffice -> Masters */}
        <Route
          path="/dashboard/backoffice/masters/designation"
          element={
            <ProtectedRoute>
              <DesignationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/backoffice/masters/kds"
          element={
            <ProtectedRoute>
              <KDSsettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/backoffice/masters/ledger"
          element={
            <ProtectedRoute>
              <Ledger />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/backoffice/masters/visit-purpose"
          element={
            <ProtectedRoute>
              <VisitPurpose />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/backoffice/masters/pick-drop"
          element={
            <ProtectedRoute>
              <PickDropFacility />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/backoffice/masters/billing-instruction"
          element={
            <ProtectedRoute>
              <BillingInstruction />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/backoffice/masters/identity"
          element={<ProtectedRoute><IdentityDetails /></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/masters/version"
          element={<ProtectedRoute><VersionPage /></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/masters/state"
          element={<ProtectedRoute><StateMaster /></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/masters/city"
          element={<ProtectedRoute><CityMaster /></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/masters/area"
          element={<ProtectedRoute><AreaMaster /></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/masters/zone"
          element={<ProtectedRoute><ZoneMaster /></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/masters/tax-rate-name"
          element={<ProtectedRoute><TaxRateName /></ProtectedRoute>}
        />



        {/* Settings */}
        <Route
          path="/dashboard/backoffice/setting/Night-audit"
          element={<ProtectedRoute><NightAuditSetting /></ProtectedRoute>}
        />

        
        
        <Route
          path="/dashboard/backoffice/setting/Commonsetting"
          element={<ProtectedRoute><CommonSetting /></ProtectedRoute>}
        />


        <Route
          path="/dashboard/backoffice/setting/Bookingnositting"
          element={<ProtectedRoute><Bookingnositting /></ProtectedRoute>}
        />

        
        <Route
          path="/dashboard/backoffice/setting/Copytablecoloumcrm"
          element={<ProtectedRoute><CopyTableColumnCRM/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/setting/STableColumnListCRM"
          element={<ProtectedRoute><TableColumnListCRM/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/setting/StoreSerialNoSetting"
          element={<ProtectedRoute><StoreSerialNoSetting/></ProtectedRoute>}
        />


        {/* Commonmaster */}
        <Route
          path="/dashboard/backoffice/CommonMaster/Unit"
          element={<ProtectedRoute><UnitPage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/CommonMaster/Subunit"
          element={<ProtectedRoute><SubUnitPage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/CommonMaster/FnbBillingType"
          element={<ProtectedRoute><FnbBillingTypePage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/CommonMaster/Currency"
          element={<ProtectedRoute><CurrencyPage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/CommonMaster/GuestType"
          element={<ProtectedRoute><GuestTypePage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/CommonMaster/Brand"
          element={<ProtectedRoute><BrandPage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/CommonMaster/Deals"
          element={<ProtectedRoute><DealsPage/></ProtectedRoute>}
        />

        
        <Route
          path="/dashboard/backoffice/CommonMaster/VoidReasons"
          element={<ProtectedRoute><VoidReasonsPage/></ProtectedRoute>}
        />

         
        <Route
          path="/dashboard/backoffice/CommonMaster/KotBookManual"
          element={<ProtectedRoute><KotBookManualPage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/CommonMaster/PrinterSet"
          element={<ProtectedRoute><PrinterSetPage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/CommonMaster/VegType"
          element={<ProtectedRoute><VegTypePage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/CommonMaster/EmailerCreation"
          element={<ProtectedRoute><EmailerCreationPage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/CommonMaster/EmailSetting"
          element={<ProtectedRoute><EmailSettingPage/></ProtectedRoute>}
        />



         {/* QRMaster */}
         <Route
          path="/dashboard/backoffice/QRMaster/QRMenuSetting"
          element={<ProtectedRoute><QRMenuSettingPage/></ProtectedRoute>}
        />



        {/* FNB */}
        <Route
          path="/dashboard/backoffice/fnb/AddPosCustomerSetting"
          element={<ProtectedRoute><AddPosCustomerSetting/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/fnb/CoponMaster"
          element={<ProtectedRoute><CouponMaster/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/fnb/Outlet"
          element={<ProtectedRoute><Outlet/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/fnb/Table"
          element={<ProtectedRoute><TablePage/></ProtectedRoute>}
        />

        
        <Route
          path="/dashboard/backoffice/fnb/ParentCategoryPage"
          element={<ProtectedRoute><ParentCategoryPage/></ProtectedRoute>}
        />

         
        <Route
          path="/dashboard/backoffice/fnb/Category"
          element={<ProtectedRoute><CategoryPage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/fnb/MenuGroup"
          element={<ProtectedRoute><MenuGroupPage/></ProtectedRoute>}
        />

        
        <Route
          path="/dashboard/backoffice/fnb/Item"
          element={<ProtectedRoute><ItemPage/></ProtectedRoute>}
        />

         
        <Route
          path="/dashboard/backoffice/fnb/AddItemToOutlet"
          element={<ProtectedRoute><AddItemToOutletPage/></ProtectedRoute>}
        />

         
        <Route
          path="/dashboard/backoffice/fnb/OutOfStock"
          element={<ProtectedRoute><OutOfStock/></ProtectedRoute>}
        />


        <Route
          path="/dashboard/backoffice/fnb/AddKitchen"
          element={<ProtectedRoute><AddKitchen/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/fnb/KitchenTransferOutlet"
          element={<ProtectedRoute><KitchenTransferOutlet/></ProtectedRoute>}
        />

        
        <Route
          path="/dashboard/backoffice/fnb/BanquetGroup"
          element={<ProtectedRoute><BanquetGroup/></ProtectedRoute>}
        />




         {/* Room\Room */}
           
        <Route
          path="/dashboard/backoffice/room/TaxRange"
          element={<ProtectedRoute><TaxRange/></ProtectedRoute>}
        />

            
        <Route
          path="/dashboard/backoffice/room/ReservationCancelSetting"
          element={<ProtectedRoute><ReservationCancelSetting/></ProtectedRoute>}
        />

            
        <Route
          path="/dashboard/backoffice/room/FloorMaster"
          element={<ProtectedRoute><FloorMaster/></ProtectedRoute>}
        />

             
        <Route
          path="/dashboard/backoffice/room/RoomViewType"
          element={<ProtectedRoute><RoomViewType/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/room/BedSize"
          element={<ProtectedRoute><BedSize/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/room/AmenityCategory"
          element={<ProtectedRoute><AmenityCategory/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/room/AmenitySubCategory"
          element={<ProtectedRoute><AmenitySubcategory/></ProtectedRoute>}
        />

        
        <Route
          path="/dashboard/backoffice/room/RoomCategory"
          element={<ProtectedRoute><RoomCategory/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/room/RoomPlanType"
          element={<ProtectedRoute><RoomPlanType/></ProtectedRoute>}
        />

        
        <Route
          path="/dashboard/backoffice/room/RoomType"
          element={<ProtectedRoute><RoomType/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/room/RoomNoMaster"
          element={<ProtectedRoute><RoomNoMaster/></ProtectedRoute>}
        />



        
         {/* Currency */}
         <Route
          path="/dashboard/backoffice/currency/Setup"
          element={<ProtectedRoute><CurrencySetup/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/currency/Exchange"
          element={<ProtectedRoute><CurrencyExchange/></ProtectedRoute>}
        />



        {/* Nc */}
        <Route
          path="/dashboard/backoffice/nc/NcCosting"
          element={<ProtectedRoute><NcCosting/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/nc/Department"
          element={<ProtectedRoute><Department/></ProtectedRoute>}
        />



        {/* Report */}
        
        <Route
          path="/dashboard/backoffice/report/UserList"
          element={<ProtectedRoute><UserList/></ProtectedRoute>}
        />


        <Route
          path="/dashboard/backoffice/report/FeedbackList"
          element={<ProtectedRoute><FeedbackList/></ProtectedRoute>}
        />






         {/* Complain */}
         <Route
          path="/dashboard/backoffice/complain/ComplainType"
          element={<ProtectedRoute><ComplainType/></ProtectedRoute>}
        />


        <Route
          path="/dashboard/backoffice/complain/ComplainUserList"
          element={<ProtectedRoute><ComplainUserList/></ProtectedRoute>}
        />




         {/* Production */}
         <Route
          path="/dashboard/backoffice/production/ProductionFinish"
          element={<ProtectedRoute><ProductionFinish/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/production/AddProduction"
          element={<ProtectedRoute><AddProduction/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/production/ProductionProcess"
          element={<ProtectedRoute><ProductionProcess/></ProtectedRoute>}
        />





         {/* Accounts */}
         <Route
          path="/dashboard/backoffice/accounts/LedgerExport"
          element={<ProtectedRoute><LedgerExportPage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/accounts/VoucherExport"
          element={<ProtectedRoute><VoucherExportPage/></ProtectedRoute>}
        />

        <Route
          path="/dashboard/backoffice/accounts/UploadEinvoice"
          element={<ProtectedRoute><UploadEinvoicePage/></ProtectedRoute>}
        />





         {/* Membership */}
         
        <Route
          path="/dashboard/backoffice/membership/MemberShipType"
          element={<ProtectedRoute><MemberShipType/></ProtectedRoute>}
        />

          
        <Route
          path="/dashboard/backoffice/membership/MemberShipService"
          element={<ProtectedRoute><MemberShipService/></ProtectedRoute>}
        />

          
        <Route
          path="/dashboard/backoffice/membership/MemberShipPlan"
          element={<ProtectedRoute><MemberShipPlan/></ProtectedRoute>}
        />

           
        <Route
          path="/dashboard/backoffice/membership/MemberShipSetting"
          element={<ProtectedRoute><MemberShipSetting/></ProtectedRoute>}
        />

        {/* <Route
          path="/dashboard/backoffice/membership/MemberShipPlanDetails"
          element={<ProtectedRoute><MemberShipPlanDetails/></ProtectedRoute>}
        /> */}




        
        {/* Reservation flows */}
        <Route
          path="/reservation/new"
          element={
            <ProtectedRoute>
              <NewReservation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservation/booking-details"
          element={
            <ProtectedRoute>
              <ReservationDetails />
            </ProtectedRoute>
          }
        />
         <Route
          path="/reservation/StatusView"
          element={
            <ProtectedRoute>
              <ReservationStatusView />
            </ProtectedRoute>
          }
        />
         <Route
          path="/reservation/CancelReservationList"
          element={
            <ProtectedRoute>
              <CancelReservationList />
            </ProtectedRoute>
          }
        />
         <Route
          path="/reservation/ReservationCalendar"
          element={
            <ProtectedRoute>
              <ReservationCalendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservation/AdvanceDeposit"
          element={
            <ProtectedRoute>
              <AdvanceDeposit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservation/ReturnPaidup"
          element={
            <ProtectedRoute>
              <ReturnPaidup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservation/NoShowRoomReport"
          element={
            <ProtectedRoute>
              <NoShowRoomReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservation/BookingSheetAccounts"
          element={
            <ProtectedRoute>
              <BookingSheetAccounts />
            </ProtectedRoute>
          }
        />


   
        {/* Frontoffice */}
        <Route
          path="/Reservation/frontoffice/PreRegCard"
          element={
            <ProtectedRoute>
              <PreRegCard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Reservation/frontoffice/CheckinGuest"
          element={
            <ProtectedRoute>
              <CheckInGuest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Reservation/frontoffice/DirectCheckInGuest"
          element={
            <ProtectedRoute>
              <DirectCheckInGuest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Reservation/frontoffice/CheckInGuestDetails"
          element={
            <ProtectedRoute>
              <CheckInGuestDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Reservation/frontoffice/PaxCheckin"
          element={
            <ProtectedRoute>
              <PaxCheckin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Reservation/frontoffice/CancelBookingDetails"
          element={
            <ProtectedRoute>
              <CancelBookingDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Reservation/frontoffice/RoomCalendar"
          element={
            <ProtectedRoute>
              <RoomCalendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Reservation/frontoffice/LinkedUnlinkedReport"
          element={
            <ProtectedRoute>
              <LinkedUnlinkedReport />
            </ProtectedRoute>
          }
        />
         <Route
          path="/Reservation/frontoffice/CheckOutGuest"
          element={
            <ProtectedRoute>
              <CheckOutGuest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Reservation/frontoffice/Calendar"
          element={
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/Reservation/frontoffice/GuestCheckoutExtend"
          element={
            <ProtectedRoute>
              <GuestCheckoutExtend />
            </ProtectedRoute>
          }
        />



         {/* Housekeeping */}
         <Route
          path="/dashboard/Housekeeping/RoomStatusBoard"
          element={
            <ProtectedRoute>
              <RoomStatusBoard />
            </ProtectedRoute>
          }
        />
         <Route
          path="/dashboard/Housekeeping/AssignTasks"
          element={
            <ProtectedRoute>
              <AssignTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/Housekeeping/CleaningSchedule"
          element={
            <ProtectedRoute>
              <CleaningSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/Housekeeping/RoomInspection"
          element={
            <ProtectedRoute>
              <RoomInspection />
            </ProtectedRoute>
          }
        />
         <Route
          path="/dashboard/Housekeeping/TurnDownService"
          element={
            <ProtectedRoute>
              <TurnDownService />
            </ProtectedRoute>
          }
        />
         <Route
          path="/dashboard/Housekeeping/DeepCleaningPlanner"
          element={
            <ProtectedRoute>
              <DeepCleaningPlanner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/Housekeeping/LostAndFound"
          element={
            <ProtectedRoute>
              <LostAndFound />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/Housekeeping/MaintenanceRequests"
          element={
            <ProtectedRoute>
              <MaintenanceRequests />
            </ProtectedRoute>
          }
        />
         <Route
          path="/dashboard/Housekeeping/LinenInventory"
          element={
            <ProtectedRoute>
              <LinenInventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/Housekeeping/MinibarRefill"
          element={
            <ProtectedRoute>
              <MinibarRefill />
            </ProtectedRoute>
          }
        />



        {/* Reports */}
        <Route
          path="/dashboard/Housekeeping/Reports/Productivity"
          element={
            <ProtectedRoute>
              <Productivity />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/Housekeeping/Reports/StatusHistory"
          element={
            <ProtectedRoute>
              <StatusHistory />
            </ProtectedRoute>
          }
        />
         <Route
          path="/dashboard/Housekeeping/Reports/LostFoundLog"
          element={
            <ProtectedRoute>
              <LostFoundLog />
            </ProtectedRoute>
          }
        />
         <Route
          path="/dashboard/Housekeeping/Reports/MaterialsUsage"
          element={
            <ProtectedRoute>
              <MaterialsUsage />
            </ProtectedRoute>
          }
        />


        
        
        {/* Pos */}
        <Route
          path="/dashboard/Pos/OrderEntry"
          element={
            <ProtectedRoute>
              <OrderEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/Pos/RunningOrders"
          element={
            <ProtectedRoute>
              <RunningOrders />
            </ProtectedRoute>
          }
          />
          <Route
          path="/dashboard/Pos/HoldUnpaid"
          element={
            <ProtectedRoute>
              <HoldUnpaid />
            </ProtectedRoute>
          }
          />
          <Route
          path="/dashboard/Pos/Cancelled"
          element={
            <ProtectedRoute>
              <Cancelled />
            </ProtectedRoute>
          }
          />


        
         {/* Tables */}
         <Route
          path="/dashboard/Pos/Tables/TableStatus"
          element={
            <ProtectedRoute>
              <TableStatus />
            </ProtectedRoute>
          }
          />
          <Route
          path="/dashboard/Pos/Tables/MergeSplit"
          element={
            <ProtectedRoute>
              <MergeSplit />
            </ProtectedRoute>
          }
          />
          <Route
          path="/dashboard/Pos/Tables/MoveTable"
          element={
            <ProtectedRoute>
              <MoveTable />
            </ProtectedRoute>
          }
          />
        
        

         {/* Kitchen */} 
         <Route
          path="/dashboard/Pos/Tables/KOTBoard"
          element={
            <ProtectedRoute>
              <KOTBoard />
            </ProtectedRoute>
          }
          />
           <Route
          path="/dashboard/Pos/Tables/ReprintKOT"
          element={
            <ProtectedRoute>
              <ReprintKOT />
            </ProtectedRoute>
          }
          />
          <Route
          path="/dashboard/Pos/Tables/KDS"
          element={
            <ProtectedRoute>
              <KDS />
            </ProtectedRoute>
          }
          />
         
         
         
         {/* Billing */} 
         <Route
          path="/dashboard/Pos/Billing/GenerateBill"
          element={
            <ProtectedRoute>
              <GenerateBill />
            </ProtectedRoute>
          }
          />
          <Route
          path="/dashboard/Pos/Billing/ReprintBill"
          element={
            <ProtectedRoute>
              <ReprintBill />
            </ProtectedRoute>
          }
          />
          <Route
          path="/dashboard/Pos/Billing/VoidReturn"
          element={
            <ProtectedRoute>
              <VoidReturn />
            </ProtectedRoute>
          }
          />



          {/* Inventory */} 
          <Route
          path="/dashboard/Pos/Inventory/Items"
          element={
            <ProtectedRoute>
              <Items />
            </ProtectedRoute>
          }
          />
          <Route
          path="/dashboard/Pos/Inventory/StockInOut"
          element={
            <ProtectedRoute>
              <StockInOut />
            </ProtectedRoute>
          }
          />
          <Route
          path="/dashboard/Pos/Inventory/OutofStock"
          element={
            <ProtectedRoute>
              <OutOfStock />
            </ProtectedRoute>
          }
          />


         {/* Reports */} 
         <Route
          path="/dashboard/Pos/Reports/ZReport"
          element={
            <ProtectedRoute>
              <ZReport />
            </ProtectedRoute>
          }
          />
          <Route
          path="/dashboard/Pos/Reports/SalesSummary"
          element={
            <ProtectedRoute>
              <SalesSummary />
            </ProtectedRoute>
          }
          />
          <Route
          path="/dashboard/Pos/Reports/TaxSummary"
          element={
            <ProtectedRoute>
              <TaxSummary />
            </ProtectedRoute>
          }
          />
          <Route
          path="/dashboard/Pos/Reports/DiscountReport"
          element={
            <ProtectedRoute>
              <DiscountReport />
            </ProtectedRoute>
          }
          />



        

         {/* Settings */} 
         <Route
          path="/dashboard/Pos/Settings/Printers"
          element={
            <ProtectedRoute>
              <Printers />
            </ProtectedRoute>
          }
          />
           <Route
          path="/dashboard/Pos/Settings/Counters"
          element={
            <ProtectedRoute>
              <Counters />
            </ProtectedRoute>
          }
          />
           <Route
          path="/dashboard/Pos/Settings/PaymentModes"
          element={
            <ProtectedRoute>
              <PaymentModes />
            </ProtectedRoute>
          }
          />
           <Route
          path="/dashboard/Pos/Settings/ServiceCharge"
          element={
            <ProtectedRoute>
              <ServiceCharge />
            </ProtectedRoute>
          }
          />






        
      















        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
