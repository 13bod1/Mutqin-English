# Sprint 3 real server contracts — PR only

This PR must remain OPEN. User explicitly prohibited merging, main writes, production DDL and deploy configuration changes after the transient site incident. These migrations/functions are not installed on production. Current production lacks the old announcements/payments tables (observed PGRST205); that is a separate schema mismatch, not a proven explanation for the transient outage.

## Implemented and actually exercised
- Q&A migration003: durable questions, staff-onlypending RLS (including authorpendinghidden), serverJWTidentity, transaction-advisory15slimit, auditedstaffmoderation, denieddirectwrites. AngularproductionusesactualRPC/RLSqueries; legacy synchronousdevmethods preserved without productionmockfallback.
- Push migration004: ownerboundregistration/revocation, otherstudentscannotenumeratekeys orstealendpoint, gatewayallowlist/customportsrejected, actualPushManagerbrowsercode and192/512/180PNGicons. Edgepush-dispatch verifiescallerandadminrole, performs WebPushvia pinnedpackage withprivateenvkeys, timeouts andgoneendpointcleanup. Function was SOURCE REVIEWED, NOT executed in Deno or deployed. Providerdelivery/physicaldevices remainunverified/configgated.
- Reports/refunds migration005: admin-onlyreportissuance/refundrequests,256bitrandomguardiancapability storedasSHA256hash,7dayexpiry/revocation, noexpired/tamperedreportdata, nootherstudent/assistantreporttableenumeration. ProductionguardianpageusesserverRPC, neverdefaultstudenttoken. Refundledgeridempotentandbalancechecked; NOT externalpaymentgatewayrefundexecution.
- Playback migration006: authenticatedstudent/serverentitlement+revocation, hashedviewingsessionanddevicebinding, crossdeviceprevioussessionreplacement, expiry/tamper/copydenied. protected-media EdgeFunction streams privateStorage after verifiedGoTrue+RPCauthorizationwithoutreturningpublicURL. Function sourceonly; privatebucket/mappings/deployment stillrequired. This is NOT licensedDRM, and existinglectureplayerhasNOTbeenrewiredtoit. Do notcloseAG142solelyfromSQLtests.

## Actual final evidence
Fresh disposablePG16+officialPostgREST:50/50 assertionsPASS; migrations003–006 eachappliedtwice. ActualproductionAngularbrowser3/3: studentquestioncommitsbutpendingprivate; staffbrowserapprovesandstudentseesexactbody; guardianreportserverlookupworksandtampershowsnodata. TestidentityadapterexplicitNOTrealGoTrue.
FullBuildPASS; existingUnit173/173; E2E21/21across3engines; controlledgeneralbrowser25/25; zeroskips. ExistingtestfilesunchangedinthisPR. Firstbrowserattemptcorrectlyhit15sserverlimitbecausepreviousconcurrencycaseusedsamesyntheticidentity; isolatedscenarioagewasresetindisposabletestDBandunchangedprivacyassertionspassed. No productiondatachanged.

## Remaining acceptance gates — no fictional full completion
AG119physicalAndroid/iOSinstall, realproviderpushwithin1minandLighthouse90; AG132authorized250studentstaginglogin/video/live/paymentload; AG133licensedDRM/realmediafunctiondeploymentandclientplayerwiring; AG136ScrumMasterreviewandAG98POreview/feedbackarenotfulfilledbycode alone. Screenshot/acceptanceguidesfrommainremainhistoricalWIP. OpenBugsarenotclosedfromunexecutedproviderfunctions. This PR materiallyimplementsmissingcontracts butdoesnotclaimall11taskscomplete.

## Deployment order for an authorized future release
002prerequisite first, then003,004,005,006 with backup and schema checks in STAGING. ConfigureprivateStorageassetmapping andactualVAPID public/private secrets onlyinauthorizedenvironment; DenoEdgefunctiondeploymentandproviderintegrationretestbeforeproduction. Never ship SQL as if it had already changed the remote database.
