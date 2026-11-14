# Sprint3 Review UAT and actual internal walkthrough

Use authorized isolated staging accounts provided by facilitator: Admin/teacher,Assistant,StudentA,StudentB. No fabricated account addresses/passwords. Guardian uses a real issued seven-day capability token, never a sample-token-123. Facilitator prepares actual records and captures sourceSHA/context. This document is not a POmeeting, feedback or signature.

| PBI | User actions | Expected / current gate |
|---|---|---|
|18/AG46|Authorizedteacheropens/live/:id/studio, studentopens/live/:id;start/stop/reconnect|Actualbroadcastandrecordingrequired;signal-onlypreviewnotacceptance. End-to-endmediastagingblocked.|
|19/AG47|Studentexplicitlyoptsin;Adminpublishesannouncement;studenttapsreceivednotification|Realproviderpushwithin1minonphysicaldevice;subscriptioncodeexistsbutfunction/configdeploymentunverified. MissingVAPIDmustnotreportenabled.|
|20/AG48historical|Admin/admin/payments reconciliationtab; selectsyntheticapprovedpayment;facilitatorinvokesnewrequest_refund_recordRPCwithidempotencykey|Serverledgerdeniesstudent/assistantandduplicates/overbalance;actualgatewayrefundNOTexecuted. CurrentAG48lookup404unresolved;donotclaimreorganization. UIrefundflowmaystillbeclientlocal,notwiredtothisnewRPC.|
|21/AG94|Studentopensauthorizedlecture;facilitatorchecksserver-sessionexpiry/tamper/devicecopy/replacement|SQLdenialverifiedlocally;protected-mediafunction/privateStorage/playerwiring/vendorDRMstillunverified. BrowserwatermarkisnotDRM.|
|22/AG95|Studentopens/live/:id,Q&A;readrulesineachlanguage;submitoneEnglishquestion;Assistantapproves;StudentBrefreshes|PendinghiddenfromALLstudentsincludingauthor;staffseespending;approvedbodypublic;secondquestionwithin15sblockedserver-side. Actual3browsercasesandHTTPproofavailablewithdeclaredtestidentityadapter.|
|23/AG96|Guardianopensfacilitator-issuedvalidURL/guardian/report/:token;facilitatorcheckswrong/expired/revokedtoken|Serverhashlookupreturnsselectedstudentonlyandnoexpireddata. InvalidURLshowsReportNotFound. NewclientRPCtestedlocally,notdeployed;weeklygenerator/externaldispatchnotcompleted.|

## Internal walkthrough actually executed
Executor: automated agent, not Samer/Sherry/PO human. Exact timestamp and local server: see capture_receipt.json; do not copy an outdated timestamp. Chromiumdesktop1280x900 plus separatemobile360x800offlinecontext.
Executed and asserted: landingheader/brand; livecatalogh2; live-sessioncomponentnavigation; invalidguardiantokenReportNotFound; actualSWcontrollerandofflinefallback; source-extractednonemptyEnglish/Arabicrulesunder60wordsandexactlyfivequestions. Screenshots are localWIP, NOT acceptedproductionstorygallery. Receiptfirstattemptfailedanincorrecth1selector; actualcatalogusesh2 andcorrectedassertionpassed. Noapplicationtestweakened.

## Not executed by this walkthrough
NoauthenticatedPOjourney,noactualteacherbroadcast,nohardwareDRM,nophysicalmobileinstall/providerarrival,no250videostaging. No assertion protectedmediaiscached/nocachedfromofflinepagewordingalone; separateSWsource-safetytestsscopeapplies.

## Human record — do not prefill
QA review of UAT: PENDING human/specialist authorized review. ScrumMasterdocumentationreview:PENDING. POsessiondate:PENDING. Feedbackitems:createonlyfromactualfeedback. Noinvented24houragendagateorhumansignatures.
