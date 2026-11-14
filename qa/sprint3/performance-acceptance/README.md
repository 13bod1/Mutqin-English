# Font subset optimization — verified reduction, performance acceptance still partial

Only application-build input changed: angular.json. All PlusJakartaSans/Inter Latinweights preserved; Alexandria/IBMPlexArabic Arabic+Latinweights preserved. Unusedunicodefontsubsetrulesremoved. Stylesheet145889->116830bytes; actualcurrentindex18215bytes. This is a real narrow optimization, not evidence of universal FCP compliance.

## Keep all observed measurements
OriginalcorrectAngularlocalbaseline1904ms; workerbaseline2064ms. Workerpostfix1752/932/952ms. ParentindependentfreshbrowserPROCESSwithNetwork.setCacheDisabled(true), serviceworkersblocked,externaltrafficblocked,actualAngularheaderassertion:1876/276/404ms. FirstsampleFAILS1800msthreshold. No cherry-picking mean or replacingfirstsamplewithbest. CPU4x,20msRTT,4*1024*1024/8downloadbytes/sec,3*1024*1024/8uploadbytes/sec. These are localhostsyntheticthrottleruns,notstagingcapacity.

## Regression evidence
ProductionbuildPASS,Unit173/173,E2E21/21,controlledbrowser25/25; existingtesthashesunchanged. SeeMILESTONE_REGRESSION.json forparsedrawreceipt. Onlysubsetconfigurationchanges, nofixture/testthresholdchange. Repo remainsPR13OPEN; no productionmigration/mainmerge.

## Reproduce parent probe
Buildproductionbundle,serve dist/mutqin-english/browser onloopback,run node qa/sprint3/performance-acceptance/parent_probe.cjs http://127.0.0.1:PORT output.json. RunserverwithproperJS/CSSmimeandrealindex; nofallbackmockHTML. Sourcehashesrecorded. SuccessfulUIinitializationasserted. parentprobeemitsnonzeroifanysampleexceeds1800ms.

## Remaining gates
AG132stillneedsreal250authenticatedstudents/live/video/paymentonAUTHORIZEDSTAGING;noenvironment/accountsprovided. Physicalpushdevices/realgatewaydelivery,licensedDRM/playerwiring andhumanQALead/ScrumMaster/POreviewsseparategates. This optimizationcannotcloseall11tasks.
