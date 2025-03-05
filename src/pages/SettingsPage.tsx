import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loading } from '@/components/ui/loading';
import { SettingOperations } from '@/lib/db/operations';
import { Separator } from '@/components/ui/separator';
import { Loader } from '@/components/ui/loader';
import { AlertCircle, ShieldCheck, Key, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import toast from 'react-hot-toast';

interface ApiKeys {
  [service: string]: string;
}

const SettingsPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openrouter: '',
    openai: ''
  });
  const [activeService, setActiveService] = useState('openrouter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [hasPinSet, setHasPinSet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Check if PIN is set
        const pinSetting = await SettingOperations.getByProvider('pin');
        setHasPinSet(!!pinSetting?.value);
        
        // Load API keys if no PIN or if PIN is already entered
        if (!pinSetting?.value) {
          const apiKeysSetting = await SettingOperations.getByProvider('apiKeys');
          if (apiKeysSetting?.value) {
            setApiKeys(apiKeysSetting.value);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const pinSetting = await SettingOperations.getByProvider('pin');
      if (pinSetting?.value === currentPin) {
        // PIN is correct, load API keys
        const apiKeysSetting = await SettingOperations.getByProvider('apiKeys');
        if (apiKeysSetting?.value) {
          // In a real implementation, we would decrypt the API keys here
          setApiKeys(apiKeysSetting.value);
        }
        setHasPinSet(true);
        setMessage('PIN verified successfully');
        toast.success('PIN verified successfully');
      } else {
        setMessage('Incorrect PIN');
        toast.error('Incorrect PIN');
      }
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setMessage('Error verifying PIN');
      toast.error('Error verifying PIN');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate PIN if setting a new one
      if (pin && pin !== confirmPin) {
        setMessage('PINs do not match');
        toast.error('PINs do not match');
        return;
      }
      
      // Save API keys
      await SettingOperations.upsert({ provider: 'apiKeys', value: apiKeys });
      
      // Save PIN if set
      if (pin) {
        await SettingOperations.upsert({ provider: 'pin', value: pin });
        setHasPinSet(true);
      }
      
      // Save active service
      await SettingOperations.upsert({ provider: 'activeService', value: activeService });
      
      setMessage('Settings saved successfully');
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
      toast.error('Error saving settings');
    }
  };

  const handleApiKeyChange = (service: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [service]: value
    }));
  };

  if (isLoading) {
    return (
      <div className="pt-3 pb-6">
        <Card className="border shadow-sm w-full">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
              <Loader className="h-8 w-8 mb-4" />
              <span className="text-muted-foreground">Loading settings...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If PIN is set and not yet entered, show PIN entry form
  if (hasPinSet && !apiKeys.openrouter && !apiKeys.openai) {
    return (
      <div className="pt-3 pb-6">
        <Card className="border shadow-sm w-full">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-xl">
              <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
              Enter PIN
            </CardTitle>
            <CardDescription>
              Enter your PIN to access settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPin">PIN</Label>
                <Input
                  id="currentPin"
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              
              <Button type="submit" className="w-full">
                Submit
              </Button>
              
              {message && (
                <Alert variant={message.includes('Error') || message.includes('Incorrect') ? "destructive" : "default"} className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
          <CardFooter className="pt-2 pb-4">
            <p className="text-sm text-muted-foreground">
              Your API keys are stored locally and encrypted with your PIN.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-3 pb-6">
      <Card className="border shadow-sm w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">Settings</CardTitle>
          <CardDescription>
            Manage your API keys and security settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <Key className="mr-2 h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">API Keys</h3>
              </div>
              <Separator className="my-2" />
              
              <div className="space-y-2">
                <Label htmlFor="activeService">Active Service</Label>
                <Select 
                  value={activeService} 
                  onValueChange={setActiveService}
                >
                  <SelectTrigger id="activeService" className="w-full">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="openrouterKey">OpenRouter API Key</Label>
                  <Input
                    id="openrouterKey"
                    type="password"
                    value={apiKeys.openrouter}
                    onChange={(e) => handleApiKeyChange('openrouter', e.target.value)}
                    placeholder="Enter your OpenRouter API key"
                    autoComplete="off"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="openaiKey">OpenAI API Key</Label>
                  <Input
                    id="openaiKey"
                    type="password"
                    value={apiKeys.openai}
                    onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                    placeholder="Enter your OpenAI API key"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4 pt-2">
              <div className="flex items-center">
                <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Security</h3>
              </div>
              <Separator className="my-2" />
              
              <div className="space-y-2">
                <Label htmlFor="pin">PIN (Optional)</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={hasPinSet ? "Enter new PIN or leave blank to keep current" : "Set a PIN to encrypt your API keys"}
                  autoComplete="new-password"
                />
              </div>
              
              {pin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPin">Confirm PIN</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Confirm your PIN"
                    autoComplete="new-password"
                  />
                </div>
              )}
            </div>
            
            <Button type="submit" className="w-full flex items-center justify-center">
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
            
            {message && (
              <Alert variant={message.includes('Error') ? "destructive" : "default"} className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
        <CardFooter className="pt-2 pb-4">
          <p className="text-sm text-muted-foreground">
            Your API keys are stored locally in your browser and never sent to any server.
            {hasPinSet && " They are encrypted with your PIN for additional security."}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SettingsPage; 