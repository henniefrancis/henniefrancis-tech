using Microsoft.Extensions.Configuration;

namespace blog
{
    public static class Config
    {
        private static string content = "content.json";

        //About
        public static string Name { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Name"];
        public static string Title { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Title"];
        public static string TagLine { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["TagLine"];
        public static string Section1 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Section1"];
        public static string Section2 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Section2"];
        public static string Section3 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("About")["Section3"];

        //Blog
        public static string Blog1 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section1"];
        public static string Blog2 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section2"];
        public static string Blog3 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section3"];
        public static string Blog4 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section4"];
        public static string Blog5 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Biography")["Section5"];

        //Home
        public static string Profile { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Profile"];
        public static string Logo { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Logo"];
        public static string Portrait { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Portrait"];
        public static string Biography { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Biography"];
        public static string Blog { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Blog"];
        public static string CurrentRole { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["CurrentRole"];
        public static string LinkedIn { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["LinkedIn"];
        public static string GitHub { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["GitHub"];
        public static string Sessionize { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Sessionize"];
        public static string TechStack { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["TechStack"];
        public static string Certifications { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Certifications"];
        public static string SpecialAwards { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["SpecialAwards"];
        public static string Capitec { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Capitec"];
        public static string Back { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Images")["Back"];

        //Special Awards
        public static string Rockstar { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("SpecialAwards")["Rockstar"];

        //Certifications: AWS
        public static string CloudPractitioner { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Foundational")["CloudPractitioner"];
        public static string SolutionsArchitect { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Associate")["SolutionsArchitect"];
        public static string CloudQuestCloudPractitioner { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:CloudQuest")["CloudPractitioner"];
        public static string CloudQuestSolutionsArchitect { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:CloudQuest")["SolutionsArchitect"];
        public static string EducateGettingStartedWithCompute { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Educate")["GettingStartedWithCompute"];
        public static string EducateGettingStartedWithNetworking { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Educate")["GettingStartedWithNetworking"];
        public static string EducateGettingStartedWithDatabases { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Educate")["GettingStartedWithDatabases"];
        public static string EducateGettingStartedWithStorage { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Educate")["GettingStartedWithStorage"];
        public static string EducateGettingStartedWithCloudOps { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:AWS:Educate")["GettingStartedWithCloudOps"];

        //Certification: Microsoft
        public static string Microsoft_badge_Power_Platform_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["power-platform-fundamentals"];
        public static string Microsoft_cert_Power_Platform_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Certificates:Data")["power-platform-fundamentals"];

        public static string Microsoft_badge_Azure_Data_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["azure-data-fundamentals"];
        public static string Microsoft_cert_Azure_Data_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Certificates:Data")["azure-data-fundamentals"];

        public static string Microsoft_badge_Azure_AI_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["azure-ai-fundamentals"];
        public static string Microsoft_cert_Azure_AI_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Certificates:Data")["azure-ai-fundamentals"];

        public static string Microsoft_badge_Azure_SCI_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["azure-sci-fundamentals"];
        public static string Microsoft_cert_Azure_SCI_Fundamentals { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Certificates:Data")["azure-sci-fundamentals"];

        public static string Microsoft_badge_MCPD_Web { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["MCPD_Web"];
        public static string Microsoft_cert_MCPD_Web { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["MCPD_Web"];

        public static string Microsoft_badge_dotnet_35_BID { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["dotnet_3.5_BID"];
        public static string Microsoft_cert_dotnet_35_BID { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["dotnet_3.5_BID"];

        public static string Microsoft_badge_MCTS_SQL_BI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["MCTS_SQL_BI"];
        public static string Microsoft_cert_MCTS_SQL_BI { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["MCTS_SQL_BI"];

        public static string Microsoft_badge_MCTS_SPD { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["MCTS_SPD"];
        public static string Microsoft_cert_MCTS_SPD { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["MCTS_SPD"];

        public static string Microsoft_badge_MCTS_DA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["MCTS_DA"];
        public static string Microsoft_cert_MCTS_DA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["MCTS_DA"];

        public static string Microsoft_badge_dotnet_35_DBD { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["dotnet_3.5_DBD"];
        public static string Microsoft_cert_dotnet_35_DBD { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["dotnet_3.5_DBD"];

        public static string Microsoft_badge_dotnet_35_WCF { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["dotnet_3.5_WCF"];
        public static string Microsoft_cert_dotnet_35_WCF { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["dotnet_3.5_WCF"];

        public static string Microsoft_badge_dotnet_35_EAD { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["dotnet_3.5_EAD"];
        public static string Microsoft_cert_dotnet_35_EAD { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["dotnet_3.5_EAD"];

        public static string Microsoft_badge_dotnet_35_ADO { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["dotnet_3.5_ADO"];
        public static string Microsoft_cert_dotnet_35_ADO { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["dotnet_3.5_ADO"];

        public static string Microsoft_badge_dotnet_35_ASP { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["dotnet_3.5_ASP"];
        public static string Microsoft_cert_dotnet_35_ASP { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["dotnet_3.5_ASP"];

        public static string Microsoft_badge_dotnet_35_WFA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["dotnet_3.5_WFA"];
        public static string Microsoft_cert_dotnet_35_WFA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["dotnet_3.5_WFA"];

        public static string Microsoft_badge_MCTS_WA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["MCTS_WA"];
        public static string Microsoft_cert_MCTS_WA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["MCTS_WA"];

        public static string Microsoft_badge_MCTS_SCA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["MCTS_SCA"];
        public static string Microsoft_cert_MCTS_SCA { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["MCTS_SCA"];

        public static string Microsoft_badge_MCPD { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:Badges")["MCPD"];
        public static string Microsoft_cert_MCPD { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Microsoft:CertificateID")["MCPD"];

        //Certification: Other
        public static string MCT2018_2019 { get; set; } = new ConfigurationBuilder().AddJsonFile(content).Build().GetSection("Certifications:Other:MCT")["2018-2019"];
    }
}
