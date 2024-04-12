using Amazon.SecurityToken.Model;
using Amazon.SQS;
using Amazon.SQS.Model;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Http;

namespace blog
{
    public class RazorBase : ComponentBase
    {
        [Inject] private NavigationManager NavigationManager { get; set; }
        [Inject] private IHttpContextAccessor HttpContextAccessor { get; set; }
        [Inject] private IHostEnvironment hostEnvironment { get; set; }

        public async Task Initialize()
        {
            try
            {
                if (!hostEnvironment.IsDevelopment())
                {
                    string remoteIP = HttpContextAccessor.HttpContext.Connection.RemoteIpAddress.MapToIPv4().ToString();
                    string userAgent = HttpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString();
                    var uri = new Uri(NavigationManager.Uri).GetComponents(UriComponents.PathAndQuery, UriFormat.Unescaped);

                    var response = "test";
                    await SendToAwsSqS("blog", response);
                }
            }
            catch (Exception)
            {
                await Task.Delay(1);
            }
            finally
            {
                await Task.Delay(1);
            }
        }

        private async Task SendToAwsSqS(string qUrl, string messageBody)
        {
            try
            {
                string tmpQueueURL = $"https://sqs.af-south-1.amazonaws.com/710802848577/{qUrl}";

                var aws_credentials = new Credentials();
                aws_credentials.AccessKeyId = Secrets.AWS.aws_username;
                aws_credentials.SecretAccessKey = Secrets.AWS.aws_password;

                IAmazonSQS sqsClient = new AmazonSQSClient(aws_credentials);
                SendMessageResponse responseSendMsg = await sqsClient.SendMessageAsync(tmpQueueURL, messageBody);
                /*
                Console.WriteLine($"Message added to queue\n  {qUrl}");
                Console.WriteLine($"HttpStatusCode: {responseSendMsg.HttpStatusCode}");
                */
                await Task.Delay(1);
            }
            catch (Exception)
            {
                await Task.Delay(1);
            }
            finally
            {
                await Task.Delay(1);
            }
        }
    }
}
