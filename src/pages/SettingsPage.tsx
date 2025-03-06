import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';
import { SettingOperations } from '@/lib/db/operations';
import { Separator } from '@/components/ui/separator';
import { Loader } from '@/components/ui/loader';
import { AlertCircle, ShieldCheck, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import toast from 'react-hot-toast';
import { LLMSettings } from '@/components/settings/LLMSettings';

interface ApiKeys {
  [service: string]: string;
}

const SettingsPage: React.FC = () => {
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

  const handleSaveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate PIN if setting a new one
      if (pin && pin !== confirmPin) {
        setMessage('PINs do not match');
        toast.error('PINs do not match');
        return;
      }
      
      // Save PIN if set
      if (pin) {
        await SettingOperations.upsert({ provider: 'pin', value: pin });
        setHasPinSet(true);
      }
      
      setMessage('Security settings saved successfully');
      toast.success("Security settings saved successfully");
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
      toast.error('Error saving settings');
    }
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
  if (hasPinSet && !currentPin) {
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
    <div className="pt-3 pb-6 space-y-6">
      {/* AI Provider Settings */}
      <LLMSettings />
      
      {/* Security Settings */}
      <Card className="border shadow-sm w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-xl">
            <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage security settings for your API keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSecuritySettings} className="space-y-4">
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
            
            <Button 
              type="submit" 
              className="w-full flex items-center justify-center"
              disabled={!pin && !hasPinSet}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Security Settings
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