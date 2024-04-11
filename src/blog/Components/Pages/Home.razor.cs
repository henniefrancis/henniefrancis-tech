namespace blog.Components.Pages
{
    public class HomeModel : RazorBase
    {
        protected override async Task OnInitializedAsync()
        {
            await Initialize();
        }
    }
}
