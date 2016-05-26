/*
Script is attached to Sales Orders.
Will run any time a new sales order is placed.
If a sales order conatains a digital magazine (Subscription or Individual Issues) the appropriate emails are sent.
*/
function afterSubmit(type)
{
	try
	{
		if(type.toLowerCase() == 'create')
		{
			var newId = nlapiGetRecordId();
			var record = nlapiLoadRecord('salesorder', newId);
			var lineItemCount = record.getLineItemCount('item');
			var subClass = new Array();
			var wbindividuallist = new Array();
			var wbnamelist = new Array();
						
			// Create search filters and columns based off of UI set details
			var filters = new Array();
			filters[0] = new nlobjSearchFilter('internalidnumber', null, 'equalto', newId );
			
			var columns = new Array();
			columns[0] = new nlobjSearchColumn('custitem_wbindividual', 'item'); // Zmag ID
			columns[1] = new nlobjSearchColumn('displayname', 'item');	// Item Name

			var results = nlapiSearchRecord('transaction', null, filters, columns);	// Search: Get list of individual copies sold
			
			// Compile list of copies sold
			for(var x = 0; x < results.length; x++)
			{
				if(results[x].getValue('custitem_wbindividual', 'item') != ''){
					
					wbindividuallist = wbindividuallist.concat(results[x].getValue('custitem_wbindividual', 'item')); // Zmag ID
					wbnamelist = wbnamelist.concat(results[x].getValue('displayname', 'item')); // Item Name
				}
			}

			// Get information from sales order
			var ordStatus = record.getFieldValue('orderstatus'); // Order Status: 'A' == Pending Fulfillment || 'B' == Pending Billing
			var renewal = record.getFieldValue('custbody_renewal'); // Renewal Status: T || F
			var cust = record.getFieldValue('entity'); // Customer Name
			
			// Loop for every line item on the sales order
			for(var i = 1; i <= lineItemCount; i++)
			{
				var item = record.getLineItemValue('item', 'item', i); // Item: Item
				subClass[i-1] = record.getLineItemValue('item', 'custcol_sub_class', i); // Item: Subclass: '8' == Whistleblower (Digital)
				
				// Search: Find subscription status
				var filters2 = new nlobjSearchFilter('internalidnumber', null, 'equalto', item);
				var columns2 = new nlobjSearchColumn('custitem_subscription');
				var results2 = nlapiSearchRecord('item', null, filters2, columns2);	
				var subStatus = results2[0].getValue('custitem_subscription'); // Subscription Status: T == Active || F == Inactive
				
				// Whistleblower Individual Email
				if((subClass[i-1] == '8') && (ordStatus != 'A') && (renewal != 'T') && (Number(wbindividuallist.length) != Number(0)) && (subStatus != 'T')) 
				{
					var wbIndividual = new magazine(cust, 'Your digital Whistleblower Issue is here!'); // Instantiate magazine class
					wbIndividual.setBody(514407); // Concat email body template file
					wbIndividual.setIssues(wbindividuallist, wbnamelist); // Include individual issues in to body
					wbIndividual.setBody(514507); // Concat email body template file
					wbIndividual.sendEmail(); // Send magazine
				}
				
				// Whistleblower Subscription Initial Email
				if((subClass[i-1] == '8') && (ordStatus != 'A') && (renewal != 'T') && (subStatus == 'T') && ((cust == '379543') || cust == '582448')) // Customer send limiter to be removed after development
				{
					var wbSub = new magazine(cust, 'Information about your new Whistleblower subscription'); // Instantiate magazine class
					wbSub.setBody(514305); // Set email body template file
					wbSub.sendEmail(); // Send magazine
				}
			}
		}
	}
    catch(e)
	{
		var err = '';
		if ( e instanceof nlobjError )
		{
			
			err = 'System error: ' + e.getCode() + '\n' + e.getDetails();
		}
		else
		{
			err = 'Unexpected error: ' + e.toString();
		}
	
		return false;	
    } 
}

//magazine class to be used for each potential email send
function magazine(cust, sub)
{
	this.from = Number(139840); // WB Help (wbhelp@wnd.com)
	this.subject = sub;
	this.customerID = Number(cust);
	this.cc = 'wnw@wnd.com';
	this.body = '';

	// Send email
	this.sendEmail = function sendEmail()
	{
		nlapiSendEmail(this.from, this.customerID, this.subject, this.body);
		nlapiLogExecution('DEBUG', 'Email', 'Whistleblower Welcome Email sent successfuly!');
	}
	
	// Set body of email
	this.setBody = function setBody(scriptID)
	{
		var tempBody = nlapiLoadFile(scriptID);
		this.body += tempBody.getValue();
	}
	
	// Set individual issue links (Only for individual issues, not subscriptions)
	this.setIssues = function setIssues(zmagID, issueName)
	{
		for(var x = 0; x < zmagID.length; x++)
		{
			var urllink = 'http://viewer.zmags.com/publication/' + zmagID;
			var text = issueName;
			this.body += '<center><a href="'+ urllink +'">' + text + '</a></center>';
		}
	}
}
